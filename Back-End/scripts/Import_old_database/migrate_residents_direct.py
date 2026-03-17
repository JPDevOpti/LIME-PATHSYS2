#!/usr/bin/env python3
"""
Migración directa de residentes: Atlas (lime_pathsys) → local (pathsys).

Combina:
  - colección 'residents' (Atlas): datos de perfil, password plano (sin firma)
  - colección 'users' role=resident (Atlas): password_hash de producción

Para cada residente:
  - Elimina primero todos los usuarios role=resident en destino (importación limpia)
  - Inserta desde cero los residentes de Atlas (sin signature)

El password_hash de Atlas (argon2id) se usa directamente para que las
contraseñas anteriores sigan funcionando sin cambios.
Si un usuario no tiene hash en Atlas → se hashea su password plano.

LEGACY_ATLAS_URI="mongodb+srv://juanrestrepo183:cHp6ewrNmsPxfwfG@cluster0.o8uta.mongodb.net/" \
python3 migrate_residents_direct.py --dry-run --dest-url "mongodb+srv://juanpablorestrepo2020:RwDzfZCJskMeCiBP@cluster0.myvykk4.mongodb.net/" --dest-db pathsys

Uso:
    python3 migrate_residents_direct.py [--dry-run]
"""

import os
import sys
import argparse
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
except ImportError:
    print("ERROR: instala passlib:  pip3 install 'passlib[argon2]'")
    sys.exit(1)

# ── Configuración ─────────────────────────────────────────────────────────────

ATLAS_URL = os.environ.get("LEGACY_ATLAS_URI", "")
ATLAS_DB = "lime_pathsys"
LOCAL_URL = os.environ.get("DEST_ATLAS_URI") or os.environ.get("MONGODB_URI") or "mongodb://localhost:27017"
LOCAL_DB = "pathsys"

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


def get_password_hash(plain: str) -> str:
    return pwd_context.hash(plain)


# ── Main ──────────────────────────────────────────────────────────────────────


def run(
    dry_run: bool,
    dest_url: str = LOCAL_URL,
    dest_db: str = LOCAL_DB,
):
    print("=" * 62)
    print("  MIGRACIÓN: residentes lime_pathsys → pathsys (local)")
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

    src_residents = atlas[ATLAS_DB]["residents"]
    src_users = atlas[ATLAS_DB]["users"]
    dst_users = local[dest_db]["users"]

    if not dry_run:
        dst_users.create_index("email", unique=True)

    print("Cargando usuarios Atlas (role=resident)...")
    atlas_users_by_code: dict[str, dict] = {}
    for u in src_users.find({"role": "resident"}):
        code = str(u.get("resident_code") or "").strip()
        atlas_users_by_code[code] = u
    print(f"  Usuarios Atlas encontrados: {len(atlas_users_by_code)}")

    existing_local_count = dst_users.count_documents({"role": "resident"})
    print(f"Residentes actualmente en destino: {existing_local_count}")
    if dry_run:
        print("  [DRY-RUN] Se eliminarían todos los residentes locales antes de insertar")
    else:
        deleted = dst_users.delete_many({"role": "resident"}).deleted_count
        print(f"  Eliminados en destino: {deleted}")

    total_atlas = src_residents.count_documents({})
    print(f"  Residentes en Atlas:    {total_atlas}")
    print("-" * 62)

    stats = {"inserted": 0, "deleted": existing_local_count, "skipped": 0, "errors": 0}
    now = datetime.utcnow()

    for res in src_residents.find({}):
        code = (res.get("resident_code") or res.get("pathologist_code") or "").strip()
        name = (res.get("resident_name") or res.get("pathologist_name") or res.get("name") or "").strip()
        email = (res.get("resident_email") or res.get("pathologist_email") or res.get("email") or "").strip().lower()

        if not email:
            print(f"  [SKIP] Sin email: {name!r}")
            stats["skipped"] += 1
            continue

        atlas_user = atlas_users_by_code.get(code, {})
        password_hash = atlas_user.get("password_hash")

        if not password_hash:
            plain = (res.get("password") or code or "").strip()
            if plain:
                password_hash = get_password_hash(plain)
                print(f"  [HASH] {name}: hasheando password plano")
            else:
                print(f"  [SKIP] Sin password: {name!r}")
                stats["skipped"] += 1
                continue

        is_active = res.get("is_active", True)
        created_at = parse_dt(res.get("created_at")) or now
        updated_at = parse_dt(res.get("updated_at")) or now
        initials = (res.get("initials") or "").strip() or None
        medical_lic = (res.get("medical_license") or "").strip() or None
        observations = res.get("observations") or None
        if isinstance(observations, str):
            observations = observations.strip() or None

        doc = {
            "name": name,
            "email": email,
            "password_hash": password_hash,
            "role": "resident",
            "resident_code": code,
            "document": code,
            "initials": initials,
            "medical_license": medical_lic,
            "observations": observations,
            "signature": "",
            "is_active": is_active,
            "created_at": created_at,
            "updated_at": updated_at,
        }

        if dry_run:
            print(f"  [INSERT-DRY] {email:40} → {name}")
            stats["inserted"] += 1
            continue

        try:
            dst_users.insert_one(doc)
            print(f"  [INSERT] {email:40} → {name}")
            stats["inserted"] += 1
        except DuplicateKeyError:
            print(f"  [DUP] {email} ya existe (race condition)")
            stats["skipped"] += 1
        except Exception as e:
            print(f"  [ERROR] {email}: {e}")
            stats["errors"] += 1

    atlas.close()
    local.close()

    print("-" * 62)
    print("RESULTADO")
    print("-" * 62)
    print(f"  Eliminados previos (destino)  : {stats['deleted']}")
    print(f"  Insertados (nuevos)           : {stats['inserted']}")
    print(f"  Omitidos                      : {stats['skipped']}")
    print(f"  Errores                       : {stats['errors']}")
    if dry_run:
        print("\n  DRY-RUN: ningún cambio realizado.")
    print("=" * 62)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migra residentes de Atlas a local")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--dest-url", default=LOCAL_URL, help="MongoDB URI destino")
    parser.add_argument("--dest-db", default=LOCAL_DB, help="Base de datos destino")
    args = parser.parse_args()
    run(dry_run=args.dry_run, dest_url=args.dest_url, dest_db=args.dest_db)
