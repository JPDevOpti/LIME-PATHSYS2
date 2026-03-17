#!/usr/bin/env python3
"""
Orquestador único de migraciones directas: Atlas (lime_pathsys) -> local (pathsys).

Unifica la ejecución de:
  - migrate_entities_direct.py
  - migrate_tests_direct.py
  - migrate_patients_direct.py
  - migrate_pathologists_direct.py
  - migrate_residents_direct.py
  - migrate_auxiliaries_direct.py
  - migrate_cases_direct.py
  - migrate_unread_cases_direct.py
  - update_entities_codes_and_names.py

Uso:
  python3 migrate_all_direct.py
  python3 migrate_all_direct.py --dry-run
  python3 migrate_all_direct.py --only entities tests patients
  python3 migrate_all_direct.py --skip unread_cases
  python3 migrate_all_direct.py --batch-size-patients 500 --batch-size-cases 300
  python3 migrate_all_direct.py --continue-on-error
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List

from dotenv import load_dotenv
from pymongo import MongoClient

BASE_DIR = Path(__file__).resolve().parent

# Carga .env desde Back-End/ (2 niveles arriba del script)
load_dotenv(BASE_DIR.parent.parent / ".env")

SCRIPTS: Dict[str, str] = {
    "entities": "migrate_entities_direct.py",
    "tests": "migrate_tests_direct.py",
    "patients": "migrate_patients_direct.py",
    "pathologists": "migrate_pathologists_direct.py",
    "residents": "migrate_residents_direct.py",
    "pathologist_signatures": "migrate_pathologist_signatures_direct.py",
    "auxiliaries": "migrate_auxiliaries_direct.py",
    "cases": "migrate_cases_direct.py",
    "unread_cases": "migrate_unread_cases_direct.py",
    "update_entities": "../update_entities_codes_and_names.py",
}

DEFAULT_ORDER: List[str] = [
    "entities",
    "tests",
    "patients",
    "pathologists",
    "residents",
    "pathologist_signatures",
    "auxiliaries",
    "cases",
    "unread_cases",
    "update_entities",
]

DEST_ATLAS_URL = os.environ.get("DEST_ATLAS_URI", "")
DEFAULT_DEST_URL = (
    os.environ.get("DEST_ATLAS_URI")
    or os.environ.get("MONGODB_URI")
    or "mongodb://localhost:27017"
)
DEFAULT_DEST_DB = "pathsys"


def build_command(
    script_key: str,
    dry_run: bool,
    batch_size_patients: int,
    batch_size_cases: int,
    dest_url: str,
    dest_db: str,
) -> List[str]:
    script_name = SCRIPTS[script_key]
    script_path = (BASE_DIR / script_name).resolve()

    command = [sys.executable, str(script_path)]

    if dry_run:
        command.append("--dry-run")

    if script_key == "patients":
        command.extend(["--batch-size", str(batch_size_patients)])

    if script_key == "cases":
        command.extend(["--batch-size", str(batch_size_cases)])

    command.extend(["--dest-url", dest_url, "--dest-db", dest_db])

    return command


def resolve_plan(only: List[str] | None, skip: List[str] | None) -> List[str]:
    selected = list(DEFAULT_ORDER)

    if only:
        unknown = [key for key in only if key not in SCRIPTS]
        if unknown:
            raise ValueError(f"Módulos desconocidos en --only: {', '.join(unknown)}")
        selected = [key for key in DEFAULT_ORDER if key in only]

    if skip:
        unknown = [key for key in skip if key not in SCRIPTS]
        if unknown:
            raise ValueError(f"Módulos desconocidos en --skip: {', '.join(unknown)}")
        selected = [key for key in selected if key not in set(skip)]

    return selected


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ejecuta todas las migraciones directas desde un único script"
    )
    parser.add_argument("--dry-run", action="store_true", help="Simula sin escribir cambios")
    parser.add_argument(
        "--only",
        nargs="+",
        choices=list(SCRIPTS.keys()),
        help="Ejecuta solo estos módulos (ej: --only entities tests patients)",
    )
    parser.add_argument(
        "--skip",
        nargs="+",
        choices=list(SCRIPTS.keys()),
        help="Omite estos módulos (ej: --skip unread_cases)",
    )
    parser.add_argument(
        "--batch-size-patients",
        type=int,
        default=200,
        help="Batch size para migrate_patients_direct.py (default: 200)",
    )
    parser.add_argument(
        "--batch-size-cases",
        type=int,
        default=200,
        help="Batch size para migrate_cases_direct.py (default: 200)",
    )
    parser.add_argument(
        "--continue-on-error",
        action="store_true",
        help="Continúa con el siguiente script si uno falla",
    )
    parser.add_argument(
        "--to-atlas-destination",
        action="store_true",
        help="Usa Atlas como base de datos destino",
    )
    parser.add_argument(
        "--dest-atlas-url",
        default=DEST_ATLAS_URL,
        help="MongoDB Atlas URI destino (usado con --to-atlas-destination)",
    )
    parser.add_argument(
        "--dest-url",
        default=DEFAULT_DEST_URL,
        help="MongoDB URI destino por defecto (local)",
    )
    parser.add_argument(
        "--dest-db",
        default=DEFAULT_DEST_DB,
        help="Base de datos destino",
    )
    parser.add_argument(
        "--drop",
        action="store_true",
        help="Elimina la BD destino antes de migrar (NO toca Atlas/origen)",
    )

    args = parser.parse_args()

    try:
        plan = resolve_plan(args.only, args.skip)
    except ValueError as error:
        print(f"ERROR: {error}")
        return 2

    if not plan:
        print("No hay módulos para ejecutar (revisa --only/--skip).")
        return 0

    effective_dest_url = args.dest_atlas_url if args.to_atlas_destination else args.dest_url

    print("=" * 72)
    print("  MIGRACIÓN UNIFICADA (Atlas -> destino)")
    print("=" * 72)
    print(f"Modo            : {'DRY-RUN' if args.dry_run else 'REAL'}")
    print(f"Orden de ejecución: {', '.join(plan)}")
    print(f"Batch patients  : {args.batch_size_patients}")
    print(f"Batch cases     : {args.batch_size_cases}")
    print(f"Destino DB      : {args.dest_db}")
    print(f"Destino tipo    : {'Atlas' if args.to_atlas_destination else 'Custom/Local'}")
    print(f"Drop destino    : {'SÍ (se borrará ' + args.dest_db + ')' if args.drop and not args.dry_run else 'No'}")
    print("-" * 72)

    # ── Drop destino si se solicita (nunca en dry-run) ────────────────────────
    if args.drop and not args.dry_run:
        print(f"\n[DROP] Eliminando base de datos destino...")
        print(f"       URL : {effective_dest_url}")
        print(f"       DB  : {args.dest_db}")
        try:
            drop_client = MongoClient(effective_dest_url, serverSelectionTimeoutMS=10000)
            drop_client.drop_database(args.dest_db)
            drop_client.close()
            print(f"[DROP] Base de datos '{args.dest_db}' eliminada.\n")
        except Exception as exc:
            print(f"[DROP] ERROR al eliminar la BD: {exc}")
            return 1

    results = []

    for index, script_key in enumerate(plan, start=1):
        script_name = SCRIPTS[script_key]
        script_path = BASE_DIR / script_name

        if not script_path.exists():
            message = f"[{index}/{len(plan)}] {script_name}: NO ENCONTRADO"
            print(message)
            results.append((script_key, 127, message))
            if not args.continue_on_error:
                break
            continue

        cmd = build_command(
            script_key=script_key,
            dry_run=args.dry_run,
            batch_size_patients=args.batch_size_patients,
            batch_size_cases=args.batch_size_cases,
            dest_url=effective_dest_url,
            dest_db=args.dest_db,
        )

        print(f"\n[{index}/{len(plan)}] Ejecutando {script_name}")
        print(f"Comando: {' '.join(cmd)}")

        process = subprocess.run(cmd, cwd=str(BASE_DIR))
        results.append((script_key, process.returncode, script_name))

        if process.returncode != 0:
            print(f"ERROR: {script_name} terminó con código {process.returncode}")
            if not args.continue_on_error:
                break

    print("\n" + "=" * 72)
    print("  RESUMEN")
    print("=" * 72)

    failed = 0
    executed = len(results)

    for script_key, returncode, script_name in results:
        status = "OK" if returncode == 0 else f"FAIL({returncode})"
        if returncode != 0:
            failed += 1
        print(f"- {script_key:12} -> {status:10} [{script_name}]")

    print("-" * 72)
    print(f"Ejecutados: {executed}/{len(plan)}")
    print(f"Fallidos : {failed}")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
