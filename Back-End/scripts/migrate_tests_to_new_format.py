#!/usr/bin/env python3
"""
Migra los tests dentro de samples.tests del formato legacy al nuevo formato.

Formato legacy:
    {id: "898101", name: "...", quantity: 1}

Nuevo formato:
    {id: "ObjectId de la prueba", test_code: "898101", name: "...", quantity: 1}

Para cada test en cada sample de cada caso:
1. Si tiene "id" pero no "test_code" → renombra id→test_code, busca ObjectId en colección tests.
2. Si ya tiene "test_code" → verifica que tenga "id" con el ObjectId correcto.
3. Si no se encuentra en la colección tests → id queda null.

Uso:
    python3 migrate_tests_to_new_format.py [--dry-run] [--dest-url MONGO_URI] [--dest-db DB_NAME]
"""

import argparse
import os
import re
import sys
from typing import Any

from pymongo import MongoClient
from pymongo.database import Database


def print_progress(current: int, total: int, suffix: str = "") -> None:
    width = 40
    filled = int(width * current / total) if total else width
    bar = "█" * filled + "░" * (width - filled)
    pct = (current / total * 100) if total else 100
    sys.stdout.write(f"\r  [{bar}] {pct:5.1f}% ({current}/{total}) {suffix}")
    sys.stdout.flush()
    if current >= total:
        sys.stdout.write("\n")


DEFAULT_URL = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
DEFAULT_DB = os.environ.get("MONGODB_DB", "pathsys")


def get_db(dest_url: str, dest_db: str) -> Database:
    client: MongoClient = MongoClient(dest_url)
    return client[dest_db]


def build_test_lookup(db: Database) -> dict[str, str]:
    """
    Construye un mapa {test_code_normalizado: test_id} desde la colección tests.
    """
    tests_col = db["tests"]
    lookup: dict[str, str] = {}
    for test in tests_col.find({}, {"_id": 1, "test_code": 1}):
        code = str(test.get("test_code") or "").strip()
        if code:
            lookup[code] = str(test["_id"])
    return lookup


def migrate(db: Database, dry_run: bool = False) -> None:
    cases_col = db["cases"]
    lookup = build_test_lookup(db)

    print(f"Pruebas en catálogo: {len(lookup)}")
    print(f"Modo: {'DRY-RUN (sin cambios)' if dry_run else 'EJECUCIÓN REAL'}")
    print("-" * 60)

    # Buscar casos que tienen tests con el campo "id" pero sin "test_code" (formato legacy)
    query: dict[str, Any] = {
        "samples": {"$exists": True},
        "$or": [
            {"samples.tests.test_code": {"$exists": False}},
            {"samples.tests.id": {"$type": "string", "$ne": ""}},
        ],
    }

    total = cases_col.count_documents(query)
    print(f"Casos a revisar: {total}")

    if total == 0:
        print("No hay casos que migrar.")
        return

    migrated_cases = 0
    migrated_tests = 0
    no_test_id = 0

    cursor = cases_col.find(query, {"_id": 1, "case_code": 1, "samples": 1})

    processed = 0
    for doc in cursor:
        case_id = doc["_id"]
        case_code = doc.get("case_code", "???")
        samples = doc.get("samples") or []
        modified = False

        for sample in samples:
            if not isinstance(sample, dict):
                continue
            tests = sample.get("tests") or []
            for test in tests:
                if not isinstance(test, dict):
                    continue

                if "test_code" in test and test.get("id") and len(str(test["id"])) == 24:
                    continue

                if "test_code" not in test:
                    old_id = test.get("id", "")
                    test["test_code"] = str(old_id).strip()
                    modified = True

                test_code = str(test.get("test_code", "")).strip()

                test_obj_id = lookup.get(test_code)
                if test_obj_id:
                    test["id"] = test_obj_id
                else:
                    test["id"] = None
                    if test_code:
                        no_test_id += 1

                modified = True
                migrated_tests += 1

        if modified:
            if dry_run:
                for sample in samples:
                    for test in (sample.get("tests") or []):
                        id_display = test.get("id") or "NO ENCONTRADO"
                        print(f"  [DRY-RUN] {case_code}: test_code=\"{test.get('test_code', '')}\" → id={id_display}")
            else:
                cases_col.update_one(
                    {"_id": case_id},
                    {"$set": {"samples": samples}},
                )
            migrated_cases += 1

        processed += 1
        if not dry_run:
            print_progress(processed, total, f"| casos: {migrated_cases} | tests: {migrated_tests} | sin_id: {no_test_id}")

    if dry_run:
        print()
    print("-" * 60)
    print(f"Casos procesados: {migrated_cases}")
    print(f"Tests actualizados: {migrated_tests}")
    print(f"Tests sin id encontrado en catálogo: {no_test_id}")
    if not dry_run:
        print(f"Casos actualizados en BD: {migrated_cases}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Migra tests en samples del formato {id} al formato {id, test_code}"
    )
    parser.add_argument("--dest-url", default=DEFAULT_URL, help="MongoDB URI")
    parser.add_argument("--dest-db", default=DEFAULT_DB, help="Database name")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo muestra lo que haría sin modificar la base de datos",
    )
    args = parser.parse_args()

    db = get_db(args.dest_url, args.dest_db)
    migrate(db, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
