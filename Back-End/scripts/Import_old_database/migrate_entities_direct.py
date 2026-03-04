#!/usr/bin/env python3
"""
Migración directa de entidades: Atlas (lime_pathsys) → local (pathsys).

Transformaciones:
  - entity_code → code  (uppercase, espacios → guion bajo)
  - notes       → observations
  - Resto de campos idénticos

Idempotente: salta entidades cuyo code ya existe en local.

Uso:
    python3 migrate_entities_direct.py [--dry-run]
"""

import sys
import argparse
import re
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

# ── Configuración ─────────────────────────────────────────────────────────────

ATLAS_URL = "mongodb+srv://juanrestrepo183:cHp6ewrNmsPxfwfG@cluster0.o8uta.mongodb.net/"
ATLAS_DB  = "lime_pathsys"
LOCAL_URL = "mongodb://localhost:27017"
LOCAL_DB  = "pathsys"

# Patrón válido para code en el nuevo sistema
CODE_RE = re.compile(r"^[A-Za-z0-9_-]+$")

# ── Helpers ───────────────────────────────────────────────────────────────────

def sanitize_code(raw: str) -> str:
    """Convierte a mayúsculas y reemplaza espacios/caracteres inválidos por _."""
    code = raw.strip().upper()
    code = re.sub(r"[^A-Za-z0-9_-]", "_", code)
    return code


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
    raw_code = old.get("entity_code") or old.get("code") or ""
    code     = sanitize_code(raw_code)
    now      = datetime.utcnow()
    return {
        "name":         (old.get("name") or "").strip(),
        "code":         code,
        "observations": old.get("notes") or old.get("observations") or None,
        "is_active":    old.get("is_active", True),
        "created_at":   parse_dt(old.get("created_at")) or now,
        "updated_at":   parse_dt(old.get("updated_at")) or now,
    }

# ── Main ──────────────────────────────────────────────────────────────────────

def run(dry_run: bool, dest_url: str = LOCAL_URL, dest_db: str = LOCAL_DB):
    print("=" * 62)
    print("  MIGRACIÓN DIRECTA: entidades lime_pathsys → pathsys")
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

    src = atlas[ATLAS_DB]["entities"]
    dst = local[dest_db]["entities"]

    if not dry_run:
        dst.create_index("code", unique=True)

    # Cargar codes existentes en local
    existing_codes: set[str] = {d["code"] for d in dst.find({}, {"code": 1})}
    print(f"Entidades ya en local : {len(existing_codes)}")
    print(f"Entidades en Atlas    : {src.count_documents({})}")
    print(f"{'─'*62}")

    stats = {"inserted": 0, "skipped_dup": 0, "skipped_invalid": 0, "errors": 0}

    for old in src.find({}):
        raw_code = old.get("entity_code") or old.get("code") or ""
        code     = sanitize_code(raw_code)

        if not code or not CODE_RE.match(code):
            print(f"  [INVÁLIDO] code={code!r}  nombre={old.get('name')!r}")
            stats["skipped_invalid"] += 1
            continue

        if code in existing_codes:
            stats["skipped_dup"] += 1
            continue

        doc = transform(old)

        if dry_run:
            print(f"  [DRY-RUN] {code:20} → {old.get('name')}")
            stats["inserted"] += 1
            existing_codes.add(code)
            continue

        try:
            dst.insert_one(doc)
            print(f"  [OK] {code:20} → {old.get('name')}")
            stats["inserted"] += 1
            existing_codes.add(code)
        except DuplicateKeyError:
            stats["skipped_dup"] += 1
        except Exception as e:
            print(f"  [ERROR] {code}: {e}")
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
    parser = argparse.ArgumentParser(description="Migra entidades de Atlas a local")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--dest-url", default=LOCAL_URL, help="MongoDB URI destino")
    parser.add_argument("--dest-db", default=LOCAL_DB, help="Base de datos destino")
    args = parser.parse_args()
    run(dry_run=args.dry_run, dest_url=args.dest_url, dest_db=args.dest_db)
