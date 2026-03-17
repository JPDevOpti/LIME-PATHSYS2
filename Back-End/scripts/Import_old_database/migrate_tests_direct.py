#!/usr/bin/env python3
"""
Migración directa de pruebas: Atlas (lime_pathsys) → local (pathsys).

Transformaciones:
  - Estructura idéntica al nuevo sistema
  - Se agrega agreements: [] si no existe
  - Dedup por test_code

Idempotente: salta pruebas cuyo test_code ya existe en local.

Uso:
    python3 migrate_tests_direct.py [--dry-run]
"""

import os
import sys
import argparse
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

# ── Configuración ─────────────────────────────────────────────────────────────

ATLAS_URL = os.environ.get("LEGACY_ATLAS_URI", "")
ATLAS_DB  = "lime_pathsys"
LOCAL_URL = os.environ.get("DEST_ATLAS_URI") or os.environ.get("MONGODB_URI") or "mongodb://localhost:27017"
LOCAL_DB  = "pathsys"

# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def transform(old: dict) -> dict:
    now = datetime.utcnow()
    return {
        "name":        (old.get("name") or "").strip(),
        "test_code":   (old.get("test_code") or "").strip(),
        "description": old.get("description") or None,
        "time":        int(old.get("time") or 1),
        "price":       float(old.get("price") or 0),
        "is_active":   old.get("is_active", True),
        "agreements":  old.get("agreements") or [],
        "created_at":  parse_dt(old.get("created_at")) or now,
        "updated_at":  parse_dt(old.get("updated_at")) or now,
    }

# ── Main ──────────────────────────────────────────────────────────────────────

def run(dry_run: bool, dest_url: str = LOCAL_URL, dest_db: str = LOCAL_DB):
    print("=" * 62)
    print("  MIGRACIÓN DIRECTA: pruebas lime_pathsys → pathsys")
    print("=" * 62)
    print(f"  Modo : {'DRY-RUN (sin cambios)' if dry_run else 'REAL'}\n")

    print("Conectando a Atlas...")
    atlas = MongoClient(ATLAS_URL, serverSelectionTimeoutMS=15000)
    atlas.admin.command("ping")
    print("  Atlas OK")

    print("Conectando a MongoDB destino...")
    local = MongoClient(dest_url, serverSelectionTimeoutMS=5000)
    local.admin.command("ping")
    print(f"  Destino OK (db={dest_db})\n")

    src = atlas[ATLAS_DB]["tests"]
    dst = local[dest_db]["tests"]

    if not dry_run:
        dst.create_index("test_code", unique=True)

    existing_codes: set[str] = {d["test_code"] for d in dst.find({}, {"test_code": 1})}
    print(f"Pruebas ya en local : {len(existing_codes)}")
    print(f"Pruebas en Atlas    : {src.count_documents({})}")
    print(f"{'─'*62}")

    stats = {"inserted": 0, "skipped_dup": 0, "skipped_invalid": 0, "errors": 0}

    for old in src.find({}):
        test_code = (old.get("test_code") or "").strip()

        if not test_code:
            print(f"  [INVÁLIDO] test_code vacío: {old.get('name')!r}")
            stats["skipped_invalid"] += 1
            continue

        if test_code in existing_codes:
            stats["skipped_dup"] += 1
            continue

        doc = transform(old)

        if dry_run:
            print(f"  [DRY-RUN] {test_code:15} → {old.get('name')}")
            stats["inserted"] += 1
            existing_codes.add(test_code)
            continue

        try:
            dst.insert_one(doc)
            print(f"  [OK] {test_code:15} → {old.get('name')}")
            stats["inserted"] += 1
            existing_codes.add(test_code)
        except DuplicateKeyError:
            stats["skipped_dup"] += 1
        except Exception as e:
            print(f"  [ERROR] {test_code}: {e}")
            stats["errors"] += 1

    atlas.close()
    local.close()

    print(f"{'─'*62}")
    print("RESULTADO")
    print(f"{'─'*62}")
    print(f"  Insertadas            : {stats['inserted']}")
    print(f"  Saltadas (ya existen) : {stats['skipped_dup']}")
    print(f"  Saltadas (inválidas)  : {stats['skipped_invalid']}")
    print(f"  Errores               : {stats['errors']}")
    if dry_run:
        print("\n  DRY-RUN: ningún cambio realizado.")
    print("=" * 62)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migra pruebas de Atlas a local")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--dest-url", default=LOCAL_URL, help="MongoDB URI destino")
    parser.add_argument("--dest-db", default=LOCAL_DB, help="Base de datos destino")
    args = parser.parse_args()
    run(dry_run=args.dry_run, dest_url=args.dest_url, dest_db=args.dest_db)
