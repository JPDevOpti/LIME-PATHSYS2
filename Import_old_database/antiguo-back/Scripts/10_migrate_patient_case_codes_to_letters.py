#!/usr/bin/env python3
"""
Migración de códigos de paciente y casos a prefijo de tipo de documento en letras.

Objetivo:
- Convertir códigos legacy como "1-1000203767" a "CC-1000203767".
- Aplicar la actualización tanto en colección `patients` (campo `patient_code`)
  como en colección `cases` (campo `patient_info.patient_code`).

Reglas:
- Se prioriza `identification_type` + `identification_number` cuando existan.
- Si faltan, se intenta inferir desde `patient_code` actual.
- Si no se puede inferir, se deja registro y se omite.

Uso:
  python3 Back-End/Scripts/10_migrate_patient_case_codes_to_letters.py --dry-run
  python3 Back-End/Scripts/10_migrate_patient_case_codes_to_letters.py
"""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

# Permitir import del paquete app
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = CURRENT_DIR.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def load_backend_env_file() -> None:
    """
    Carga Back-End/.env cuando el script se ejecuta fuera de esa carpeta.

    Prioriza variables ya definidas en el entorno para no sobrescribir valores
    explícitos de ejecución (ej. export MONGODB_URL=...).
    """
    env_path = BACKEND_ROOT / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if key and key not in os.environ:
            os.environ[key] = value


load_backend_env_file()

from app.config.database import get_database, close_mongo_connection


TYPE_TO_CODE: Dict[int, str] = {
    1: "CC",
    2: "CE",
    3: "TI",
    4: "PA",
    5: "RC",
    6: "DE",
    7: "NIT",
    8: "CD",
    9: "SC",
    10: "NN",
    11: "AS",
    12: "PT",
}

CODE_TO_TYPE: Dict[str, int] = {v: k for k, v in TYPE_TO_CODE.items()}
CODE_RE = re.compile(r"^([A-Za-z]+|\d+)-(.+)$")


@dataclass
class Counters:
    total: int = 0
    updated: int = 0
    skipped: int = 0
    conflicts: int = 0
    errors: int = 0


def normalize_identification_number(value: Any) -> Optional[str]:
    if value is None:
        return None
    v = str(value).strip().upper()
    if not v:
        return None
    # Mantener solo alfanumérico
    v = "".join(ch for ch in v if ch.isalnum())
    if not v:
        return None
    return v


def normalize_identification_type(value: Any) -> Optional[int]:
    if value is None:
        return None

    if isinstance(value, bool):
        return None

    if isinstance(value, int):
        return value if value in TYPE_TO_CODE else None

    s = str(value).strip().upper()
    if not s:
        return None

    if s.isdigit():
        n = int(s)
        return n if n in TYPE_TO_CODE else None

    return CODE_TO_TYPE.get(s)


def extract_from_patient_code(patient_code: Any) -> Tuple[Optional[int], Optional[str]]:
    if patient_code is None:
        return None, None

    code = str(patient_code).strip().upper()
    if not code:
        return None, None

    match = CODE_RE.match(code)
    if not match:
        return None, None

    raw_type, raw_number = match.groups()
    normalized_type = normalize_identification_type(raw_type)
    normalized_number = normalize_identification_number(raw_number)
    return normalized_type, normalized_number


def build_patient_code(identification_type: Any, identification_number: Any) -> Optional[str]:
    n_type = normalize_identification_type(identification_type)
    n_number = normalize_identification_number(identification_number)
    if n_type is None or n_number is None:
        return None
    return f"{TYPE_TO_CODE[n_type]}-{n_number}"


async def migrate_patients(dry_run: bool = False, batch_size: int = 1000) -> Tuple[Counters, Dict[str, str]]:
    db = await get_database()
    collection = db.patients

    counters = Counters()
    code_map: Dict[str, str] = {}

    cursor = collection.find({}, {
        "_id": 1,
        "patient_code": 1,
        "identification_type": 1,
        "identification_number": 1,
    }).batch_size(batch_size)

    async for patient in cursor:
        counters.total += 1

        _id = patient.get("_id")
        old_code = str(patient.get("patient_code") or "").strip()

        id_type = normalize_identification_type(patient.get("identification_type"))
        id_number = normalize_identification_number(patient.get("identification_number"))

        # Si faltan campos, intentar inferirlos del código actual
        if id_type is None or id_number is None:
            inferred_type, inferred_number = extract_from_patient_code(old_code)
            id_type = id_type or inferred_type
            id_number = id_number or inferred_number

        new_code = build_patient_code(id_type, id_number)

        if not new_code:
            counters.skipped += 1
            continue

        if old_code:
            code_map[old_code] = new_code

        if old_code == new_code:
            continue

        update_payload = {
            "patient_code": new_code,
            "identification_type": id_type,
            "identification_number": id_number,
        }

        if dry_run:
            counters.updated += 1
            continue

        try:
            result = await collection.update_one({"_id": _id}, {"$set": update_payload})
            if result.modified_count == 1:
                counters.updated += 1
            else:
                counters.skipped += 1
        except Exception as e:
            if "duplicate key" in str(e).lower():
                counters.conflicts += 1
            else:
                counters.errors += 1

    return counters, code_map


async def migrate_cases(code_map: Dict[str, str], dry_run: bool = False, batch_size: int = 1000) -> Counters:
    db = await get_database()
    collection = db.cases

    counters = Counters()

    cursor = collection.find({}, {
        "_id": 1,
        "case_code": 1,
        "patient_info.patient_code": 1,
        "patient_info.identification_type": 1,
        "patient_info.identification_number": 1,
    }).batch_size(batch_size)

    async for case in cursor:
        counters.total += 1

        _id = case.get("_id")
        patient_info = case.get("patient_info") or {}

        old_code = str(patient_info.get("patient_code") or "").strip()

        # 1) Usar mapa generado desde pacientes
        new_code = code_map.get(old_code)

        # 2) Si no hay mapa, intentar construir con campos del caso
        if not new_code:
            id_type = normalize_identification_type(patient_info.get("identification_type"))
            id_number = normalize_identification_number(patient_info.get("identification_number"))

            if id_type is None or id_number is None:
                inferred_type, inferred_number = extract_from_patient_code(old_code)
                id_type = id_type or inferred_type
                id_number = id_number or inferred_number

            new_code = build_patient_code(id_type, id_number)

        if not new_code:
            counters.skipped += 1
            continue

        if old_code == new_code:
            continue

        if dry_run:
            counters.updated += 1
            continue

        try:
            result = await collection.update_one(
                {"_id": _id},
                {"$set": {"patient_info.patient_code": new_code}}
            )
            if result.modified_count == 1:
                counters.updated += 1
            else:
                counters.skipped += 1
        except Exception:
            counters.errors += 1

    return counters


def print_summary(patients: Counters, cases: Counters, dry_run: bool) -> None:
    mode = "DRY-RUN" if dry_run else "EJECUCIÓN REAL"
    print("\n" + "=" * 70)
    print(f"RESUMEN MIGRACIÓN ({mode})")
    print("=" * 70)

    print("\n[Patients]")
    print(f"- Total revisados : {patients.total}")
    print(f"- Actualizados    : {patients.updated}")
    print(f"- Omitidos        : {patients.skipped}")
    print(f"- Conflictos      : {patients.conflicts}")
    print(f"- Errores         : {patients.errors}")

    print("\n[Cases]")
    print(f"- Total revisados : {cases.total}")
    print(f"- Actualizados    : {cases.updated}")
    print(f"- Omitidos        : {cases.skipped}")
    print(f"- Errores         : {cases.errors}")

    print("\nNota: Los códigos quedan en formato CODIGO-TEXTO, por ejemplo CC-1000203767.")
    print("=" * 70 + "\n")


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Migrar patient_code de prefijo numérico a prefijo en letras para patients y cases"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simula la migración sin escribir cambios en BD",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Tamaño de lote del cursor (default: 1000)",
    )

    args = parser.parse_args()

    print("Iniciando migración de códigos de paciente...")
    print(f"Modo: {'DRY-RUN' if args.dry_run else 'REAL'}")

    try:
        patients_counters, code_map = await migrate_patients(
            dry_run=args.dry_run,
            batch_size=args.batch_size,
        )

        cases_counters = await migrate_cases(
            code_map=code_map,
            dry_run=args.dry_run,
            batch_size=args.batch_size,
        )

        print_summary(patients_counters, cases_counters, args.dry_run)
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
