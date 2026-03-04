#!/usr/bin/env python3
"""
Importa entidades al sistema nuevo.

Puede leer desde:
  1. Archivo JSON (exportado por export_entities.py)
  2. Lista embebida (entidades del sistema antiguo)

Variables de entorno:
    MONGODB_URI o MONGODB_URL: URI de MongoDB
    DATABASE_NAME: Nombre de la base (ej: pathsys)

Uso:
    python scripts/import_entities.py [--dry-run]
    python scripts/import_entities.py --file entities.json [--dry-run]
"""

import argparse
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if os.getenv("MONGODB_URL") and not os.getenv("MONGODB_URI"):
    os.environ["MONGODB_URI"] = os.environ["MONGODB_URL"]

from app.database import get_db
from app.modules.entities.repository import EntitiesRepository

# Entidades del sistema antiguo (fallback si no hay archivo)
RAW_ENTITIES = [
    {"code": "HSV001", "name": "Hospital Universitario San Vicente de Paul"},
    {"code": "HPTU", "name": "Hospital Pablo Tobon Uribe"},
    {"code": "HSCV003", "name": "Clinica Cardiovascular Santa Maria"},
    {"code": "PARTICULAR", "name": "Particular"},
    {"code": "AMB", "name": "Hospitales Ambulatorios"},
    {"code": "INV", "name": "Investigacion"},
    {"code": "IPSA", "name": "IPS Universitaria Ambulatoria"},
    {"code": "VID", "name": "Clinica VID - Fundacion Santa Maria"},
    {"code": "PROLAB", "name": "PROLAB S.A.S"},
    {"code": "SURA", "name": "SURA"},
    {"code": "DST", "name": "Patologia Suescun S.A.S"},
    {"code": "PINTEGRAL", "name": "Patologia Integral S.A"},
    {"code": "HSVR", "name": "Centros Especializados HSVF Rionegro"},
    {"code": "NEUROC", "name": "Neurocentro - Pereira"},
    {"code": "LEON XIII", "name": "Renales IPS Clinica Leon XIII"},
    {"code": "MICRO", "name": "Microbiologia"},
    {"code": "SOMER", "name": "Clinica Somer"},
    {"code": "HGM", "name": "Hospital General de Medellin Luz Castro G."},
    {"code": "CES", "name": "Clinica CES"},
    {"code": "LIME", "name": "LIME"},
    {"code": "TEM", "name": "TEM - SIU"},
    {"code": "HAMA", "name": "Hospital Alma Mater de Antioquia"},
]


def load_entities_from_file(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("El archivo debe contener un array de entidades")
    return data


def normalize_code(code: str) -> str:
    return str(code or "").strip().upper()


def import_entities(dry_run: bool, file_path: str | None) -> None:
    if file_path:
        entities = load_entities_from_file(file_path)
        print(f"Entidades cargadas desde: {file_path}")
    else:
        entities = [{"code": r["code"], "name": r["name"]} for r in RAW_ENTITIES]
        print("Usando lista embebida de entidades")

    seen: set[str] = set()
    deduped: list[dict] = []
    for e in entities:
        code = normalize_code(e.get("code", ""))
        name = (e.get("name", "") or "").strip()
        if not code or not name:
            continue
        if code in seen:
            continue
        seen.add(code)
        deduped.append({
            "code": code,
            "name": name,
            "observations": (e.get("observations") or "").strip() or None,
            "is_active": e.get("is_active", True),
        })

    print("=" * 60)
    print("IMPORTACION DE ENTIDADES")
    print("=" * 60)
    print(f"Modo: {'DRY-RUN (sin cambios)' if dry_run else 'EJECUCION REAL'}")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total a procesar: {len(deduped)}")
    print("=" * 60)

    if dry_run:
        for i, e in enumerate(deduped, 1):
            print(f"\n[{i}/{len(deduped)}] {e['code']} - {e['name']}")
        print("\n" + "=" * 60)
        print("DRY-RUN: no se realizaron cambios")
        print("=" * 60)
        return

    try:
        db = get_db()
        db.command("ping")
    except Exception as e:
        print(f"Error de conexion a MongoDB: {e}")
        sys.exit(1)

    repo = EntitiesRepository(db)
    repo._ensure_indexes()

    created = 0
    skipped = 0
    errors = 0

    for i, e in enumerate(deduped, 1):
        print(f"\n[{i}/{len(deduped)}] {e['code']} - {e['name']}")
        try:
            if repo.code_exists(e["code"]):
                print("  [OMITIR] Codigo ya existe")
                skipped += 1
                continue
            repo.create(e)
            print("  [OK] Entidad creada")
            created += 1
        except Exception as ex:
            print(f"  [ERROR] {ex}")
            errors += 1

    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"Creadas: {created}")
    print(f"Omitidas: {skipped}")
    print(f"Errores: {errors}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Importar entidades al sistema",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  python scripts/import_entities.py --dry-run
  python scripts/import_entities.py
  python scripts/import_entities.py --file entities.json --dry-run
  python scripts/import_entities.py --file entities.json
        """,
    )
    parser.add_argument("--dry-run", action="store_true", help="Solo mostrar que se haria")
    parser.add_argument("--file", "-f", help="Archivo JSON con entidades (exportado por export_entities.py)")
    args = parser.parse_args()
    import_entities(dry_run=args.dry_run, file_path=args.file)


if __name__ == "__main__":
    main()
