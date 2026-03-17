#!/usr/bin/env python3
"""
Migración directa de auxiliares administrativos: Atlas (lime_pathsys) → local (pathsys).

Combina:
  - colección 'auxiliaries' (Atlas): datos de perfil, password plano
  - colección 'users' role=auxiliar (Atlas): password_hash de producción

Para cada auxiliar:
  - Si ya existe en local (por email) → actualiza password_hash
  - Si no existe → inserta el documento completo

El password_hash de Atlas (argon2id) se usa directamente para que las
contraseñas anteriores sigan funcionando sin cambios.
Si un usuario no tiene hash en Atlas → se hashea su password plano.

Uso:
    python3 migrate_auxiliaries_direct.py [--dry-run]
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
ATLAS_DB  = "pathsys"
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

def run(dry_run: bool, dest_url: str = LOCAL_URL, dest_db: str = LOCAL_DB):
    print("=" * 62)
    print("  MIGRACIÓN: auxiliares lime_pathsys → pathsys (local)")
    print("=" * 62)
    print(f"  Modo : {'DRY-RUN (sin cambios)' if dry_run else 'REAL'}\n")

    # ── Conexiones ────────────────────────────────────────────────────────────
    print("Conectando a Atlas...")
    atlas = MongoClient(ATLAS_URL, serverSelectionTimeoutMS=15000)
    atlas.admin.command("ping")
    print("  Atlas OK")

    print("Conectando a MongoDB destino...")
    local = MongoClient(dest_url, serverSelectionTimeoutMS=5000)
    local.admin.command("ping")
    print(f"  Destino OK (db={dest_db})\n")

    src_aux   = atlas[ATLAS_DB]["auxiliaries"]
    src_users = atlas[ATLAS_DB]["users"]
    dst_users = local[dest_db]["users"]

    # ── Índices en destino ────────────────────────────────────────────────────
    if not dry_run:
        dst_users.create_index("email", unique=True)

    # ── Índice de usuarios Atlas (role=auxiliar) por auxiliar_code ────────────
    print("Cargando usuarios Atlas (role=auxiliar)...")
    atlas_users_by_code: dict[str, dict] = {}
    for u in src_users.find({"role": "auxiliar"}):
        code = u.get("auxiliar_code") or ""
        atlas_users_by_code[code] = u
    print(f"  Usuarios Atlas encontrados: {len(atlas_users_by_code)}")

    # ── Índice de usuarios locales por email ──────────────────────────────────
    print("Cargando usuarios locales...")
    local_users_by_email: dict[str, dict] = {}
    for u in dst_users.find({"role": "auxiliar"}):
        local_users_by_email[u.get("email", "").lower()] = u
    print(f"  Auxiliares ya en local: {len(local_users_by_email)}")

    total_atlas = src_aux.count_documents({})
    print(f"  Auxiliares en Atlas:    {total_atlas}")
    print(f"{'─'*62}")

    stats = {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}
    now = datetime.utcnow()

    for aux in src_aux.find({}):
        code  = (aux.get("auxiliar_code") or "").strip()
        name  = (aux.get("auxiliar_name") or aux.get("name") or "").strip()
        email = (aux.get("auxiliar_email") or aux.get("email") or "").strip().lower()

        if not email:
            print(f"  [SKIP] Sin email: {name!r}")
            stats["skipped"] += 1
            continue

        # Obtener password_hash desde Atlas users (producción)
        atlas_user    = atlas_users_by_code.get(code, {})
        password_hash = atlas_user.get("password_hash")

        # Fallback: hashear password plano del auxiliaries collection
        if not password_hash:
            plain = (aux.get("password") or code or "").strip()
            if plain:
                password_hash = get_password_hash(plain)
                print(f"  [HASH] {name}: hasheando password plano")
            else:
                print(f"  [SKIP] Sin password: {name!r}")
                stats["skipped"] += 1
                continue

        is_active    = aux.get("is_active", True)
        created_at   = parse_dt(aux.get("created_at")) or now
        updated_at   = parse_dt(aux.get("updated_at")) or now
        observations = aux.get("observations") or None
        if isinstance(observations, str):
            observations = observations.strip() or None

        # ── Caso 1: ya existe en local → actualizar password_hash ─────────────
        if email in local_users_by_email:
            local_doc = local_users_by_email[email]
            local_id  = local_doc["_id"]

            if dry_run:
                print(f"  [UPDATE-DRY] {email:40} → {name}")
                stats["updated"] += 1
                continue

            try:
                dst_users.update_one(
                    {"_id": local_id},
                    {"$set": {
                        "password_hash": password_hash,
                        "observations":  observations,
                        "is_active":     is_active,
                        "updated_at":    updated_at,
                    }}
                )
                print(f"  [UPDATE] {email:40} → hash sincronizado")
                stats["updated"] += 1
            except Exception as e:
                print(f"  [ERROR] {email}: {e}")
                stats["errors"] += 1
            continue

        # ── Caso 2: no existe → insertar nuevo ────────────────────────────────
        doc = {
            "name":          name,
            "email":         email,
            "password_hash": password_hash,
            "role":          "auxiliar",
            "auxiliar_code": code,
            "document":      code,
            "observations":  observations,
            "is_active":     is_active,
            "created_at":    created_at,
            "updated_at":    updated_at,
        }

        if dry_run:
            print(f"  [INSERT-DRY] {email:40} → {name}")
            stats["inserted"] += 1
            local_users_by_email[email] = doc
            continue

        try:
            dst_users.insert_one(doc)
            print(f"  [INSERT] {email:40} → {name}")
            stats["inserted"] += 1
            local_users_by_email[email] = doc
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
    print(f"  Actualizados (hash)  : {stats['updated']}")
    print(f"  Insertados (nuevos)  : {stats['inserted']}")
    print(f"  Omitidos             : {stats['skipped']}")
    print(f"  Errores              : {stats['errors']}")
    if dry_run:
        print("\n  DRY-RUN: ningún cambio realizado.")
    print("=" * 62)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migra auxiliares de Atlas a local")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--dest-url", default=LOCAL_URL, help="MongoDB URI destino")
    parser.add_argument("--dest-db", default=LOCAL_DB, help="Base de datos destino")
    args = parser.parse_args()
    run(dry_run=args.dry_run, dest_url=args.dest_url, dest_db=args.dest_db)
