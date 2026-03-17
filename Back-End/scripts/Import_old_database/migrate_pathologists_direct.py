#!/usr/bin/env python3
"""
Migración directa de patólogos: Atlas (lime_pathsys) → local (pathsys).

Combina:
  - colección 'pathologists' (Atlas): datos de perfil, signature, password plano
  - colección 'users' role=pathologist (Atlas): password_hash de producción

Para cada migración de patólogos:
    - Elimina primero todos los usuarios role=pathologist en destino (importación limpia)
    - Inserta desde cero los patólogos de Atlas con signature + password_hash

El password_hash de Atlas (argon2id) se usa directamente para que las
contraseñas anteriores sigan funcionando sin cambios.
Si un usuario no tiene hash en Atlas → se hashea su password plano.

Uso:
    python3 migrate_pathologists_direct.py [--dry-run]
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


def get_password_hash(plain: str) -> str:
    return pwd_context.hash(plain)


# ── Main ──────────────────────────────────────────────────────────────────────

def run(
    dry_run: bool,
    dest_url: str = LOCAL_URL,
    dest_db: str = LOCAL_DB,
    clean_target: bool = False,
):
    print("=" * 62)
    print("  MIGRACIÓN: patólogos lime_pathsys → pathsys (local)")
    print("=" * 62)
    print(f"  Modo : {'DRY-RUN (sin cambios)' if dry_run else 'REAL'}")
    print(f"  Limpieza destino (role=pathologist): {'SI' if clean_target else 'NO'}\n")

    # ── Conexiones ────────────────────────────────────────────────────────────
    print("Conectando a Atlas...")
    atlas = MongoClient(ATLAS_URL, serverSelectionTimeoutMS=15000)
    atlas.admin.command("ping")
    print("  Atlas OK")

    print("Conectando a MongoDB destino...")
    local = MongoClient(dest_url, serverSelectionTimeoutMS=5000)
    local.admin.command("ping")
    print(f"  Destino OK (db={dest_db})\n")

    src_pathos = atlas[ATLAS_DB]["pathologists"]
    src_users  = atlas[ATLAS_DB]["users"]
    dst_users  = local[dest_db]["users"]

    if clean_target:
        if dry_run:
            existing_count = dst_users.count_documents({"role": "pathologist"})
            print(f"[DRY-RUN] Se eliminarían {existing_count} patólogos existentes en destino")
        else:
            deleted = dst_users.delete_many({"role": "pathologist"}).deleted_count
            print(f"[CLEAN] Patólogos eliminados en destino: {deleted}")

    # ── Índices en destino ────────────────────────────────────────────────────
    if not dry_run:
        dst_users.create_index("email", unique=True)

    # ── Índice de usuarios Atlas (role=pathologist) por pathologist_code ──────
    print("Cargando usuarios Atlas (role=pathologist)...")
    atlas_users_by_code: dict[str, dict] = {}
    for u in src_users.find({"role": "pathologist"}):
        code = u.get("pathologist_code") or ""
        atlas_users_by_code[code] = u
    print(f"  Usuarios Atlas encontrados: {len(atlas_users_by_code)}")

    # ── Limpiar patólogos existentes en destino (importación limpia) ──────────
    existing_local_count = dst_users.count_documents({"role": "pathologist"})
    print(f"Patólogos actualmente en destino: {existing_local_count}")
    if dry_run:
        print("  [DRY-RUN] Se eliminarían todos los patólogos locales antes de insertar")
    else:
        deleted = dst_users.delete_many({"role": "pathologist"}).deleted_count
        print(f"  Eliminados en destino: {deleted}")

    total_atlas = src_pathos.count_documents({})
    print(f"  Patólogos en Atlas:    {total_atlas}")
    print(f"{'─'*62}")

    stats = {"inserted": 0, "deleted": existing_local_count, "skipped": 0, "errors": 0}
    now = datetime.utcnow()

    for path in src_pathos.find({}):
        code  = path.get("pathologist_code", "").strip()
        name  = path.get("pathologist_name", "").strip()
        email = (path.get("pathologist_email") or "").strip().lower()

        if not email:
            print(f"  [SKIP] Sin email: {name!r}")
            stats["skipped"] += 1
            continue

        # Obtener password_hash desde Atlas users (producción)
        atlas_user   = atlas_users_by_code.get(code, {})
        password_hash = atlas_user.get("password_hash")

        # Fallback: hashear password plano del pathologists collection
        if not password_hash:
            plain = (path.get("password") or code or "").strip()
            if plain:
                password_hash = get_password_hash(plain)
                print(f"  [HASH] {name}: hasheando password plano")
            else:
                print(f"  [SKIP] Sin password: {name!r}")
                stats["skipped"] += 1
                continue

        signature   = path.get("signature") or ""
        is_active   = path.get("is_active", True)
        created_at  = parse_dt(path.get("created_at")) or now
        updated_at  = parse_dt(path.get("updated_at")) or now
        initials    = (path.get("initials") or "").strip() or None
        medical_lic = (path.get("medical_license") or "").strip() or None
        observations = path.get("observations") or None
        if isinstance(observations, str):
            observations = observations.strip() or None

        # ── Insertar nuevo (destino ya fue limpiado) ──────────────────────────
        doc = {
            "name":             name,
            "email":            email,
            "password_hash":    password_hash,
            "role":             "pathologist",
            "pathologist_code": code,
            "document":         code,
            "initials":         initials,
            "medical_license":  medical_lic,
            "observations":     observations,
            "signature":        signature,
            "is_active":        is_active,
            "created_at":       created_at,
            "updated_at":       updated_at,
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

    print(f"{'─'*62}")
    print("RESULTADO")
    print(f"{'─'*62}")
    print(f"  Eliminados previos (destino)  : {stats['deleted']}")
    print(f"  Insertados (nuevos)           : {stats['inserted']}")
    print(f"  Omitidos                      : {stats['skipped']}")
    print(f"  Errores                       : {stats['errors']}")
    if dry_run:
        print("\n  DRY-RUN: ningún cambio realizado.")
    print("=" * 62)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migra patólogos de Atlas a local")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--dest-url", default=LOCAL_URL, help="MongoDB URI destino")
    parser.add_argument("--dest-db", default=LOCAL_DB, help="Base de datos destino")
    parser.add_argument(
        "--clean-target",
        action="store_true",
        help="Elimina todos los usuarios role=pathologist en destino antes de migrar",
    )
    args = parser.parse_args()
    run(
        dry_run=args.dry_run,
        dest_url=args.dest_url,
        dest_db=args.dest_db,
        clean_target=args.clean_target,
    )
