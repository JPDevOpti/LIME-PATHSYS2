#!/usr/bin/env python3
"""
Migración específica de firmas de patólogos: Atlas (lime_pathsys) -> destino (pathsys).

Objetivo:
  - Actualizar ÚNICAMENTE el campo "signature" en usuarios role=pathologist
    que ya existen en el sistema nuevo.

Estrategia de matching:
  1) pathologist_code (principal)
  2) email (fallback, case-insensitive)

Fuente de firmas:
  - Colección Atlas `pathologists` (prioridad alta)
  - Colección Atlas `users` con role=pathologist (fallback)

Reglas:
  - Por defecto NO sobreescribe firmas ya existentes en destino.
  - Use --force para sobreescribir incluso si destino ya tiene firma.
  - Solo actualiza registros existentes; no crea usuarios nuevos.

Uso:
  python3 migrate_pathologist_signatures_direct.py --dry-run
  python3 migrate_pathologist_signatures_direct.py
  python3 migrate_pathologist_signatures_direct.py --force
  python3 migrate_pathologist_signatures_direct.py --dest-url mongodb://localhost:27017 --dest-db pathsys
"""

from __future__ import annotations

import os
import argparse
from typing import Any

from pymongo import MongoClient

ATLAS_URL = os.environ.get("LEGACY_ATLAS_URI", "")
ATLAS_DB = "lime_pathsys"
LOCAL_URL = "mongodb://localhost:27017"
LOCAL_DB = "pathsys"


def _normalize_signature(value: Any) -> str:
    signature = str(value or "").strip()
    if not signature:
        return ""

    lowered = signature.lower()

    if lowered.startswith("data:"):
        return signature

    if "localhost" in lowered and "/uploads" in signature:
        try:
            return signature[signature.find("/uploads") :]
        except Exception:
            return signature

    return signature


def _is_missing_signature(value: Any) -> bool:
    return str(value or "").strip() == ""


def _safe_lower(value: Any) -> str:
    return str(value or "").strip().lower()


def run(
    dry_run: bool,
    force: bool,
    atlas_url: str = ATLAS_URL,
    atlas_db: str = ATLAS_DB,
    dest_url: str = LOCAL_URL,
    dest_db: str = LOCAL_DB,
) -> None:
    print("=" * 72)
    print("  MIGRACIÓN DE FIRMAS DE PATÓLOGOS (solo perfiles existentes)")
    print("=" * 72)
    print(f"Modo                  : {'DRY-RUN (sin cambios)' if dry_run else 'REAL'}")
    print(f"Sobrescribir existentes: {'SI' if force else 'NO'}")

    print("\nConectando a Atlas origen...")
    atlas = MongoClient(atlas_url, serverSelectionTimeoutMS=15000)
    atlas.admin.command("ping")
    print("  Atlas OK")

    print("Conectando a MongoDB destino...")
    dest = MongoClient(dest_url, serverSelectionTimeoutMS=10000)
    dest.admin.command("ping")
    print(f"  Destino OK (db={dest_db})")

    src_pathologists = atlas[atlas_db]["pathologists"]
    src_users = atlas[atlas_db]["users"]
    dst_users = dest[dest_db]["users"]

    print("\nCargando patólogos destino (profiles ya creados)...")
    dst_by_code: dict[str, dict[str, Any]] = {}
    dst_by_email: dict[str, dict[str, Any]] = {}

    for user in dst_users.find({"role": "pathologist"}):
        code = str(user.get("pathologist_code") or "").strip()
        email = _safe_lower(user.get("email"))
        if code:
            dst_by_code[code] = user
        if email:
            dst_by_email[email] = user

    print(f"  Patólogos en destino: {len(dst_by_email)}")

    print("\nConstruyendo índice de firmas origen...")
    source_rows: list[dict[str, Any]] = []

    for row in src_pathologists.find({}):
        signature = _normalize_signature(row.get("signature"))
        if not signature:
            continue

        source_rows.append(
            {
                "source": "pathologists",
                "code": str(row.get("pathologist_code") or "").strip(),
                "email": _safe_lower(row.get("pathologist_email")),
                "name": str(row.get("pathologist_name") or "").strip(),
                "signature": signature,
            }
        )

    users_fallback_count = 0
    for row in src_users.find({"role": "pathologist"}):
        signature = _normalize_signature(row.get("signature"))
        if not signature:
            continue

        source_rows.append(
            {
                "source": "users",
                "code": str(row.get("pathologist_code") or "").strip(),
                "email": _safe_lower(row.get("email")),
                "name": str(row.get("name") or "").strip(),
                "signature": signature,
            }
        )
        users_fallback_count += 1

    print(f"  Firmas fuente (pathologists + users): {len(source_rows)}")
    print(f"  Firmas fuente desde users (fallback): {users_fallback_count}")

    stats = {
        "updated": 0,
        "would_update": 0,
        "already_with_signature": 0,
        "same_signature": 0,
        "no_match": 0,
        "invalid_source": 0,
        "errors": 0,
    }

    seen_dest_ids: set[Any] = set()

    print("\nSincronizando firmas...")
    for src in source_rows:
        code = src["code"]
        email = src["email"]
        signature = src["signature"]
        name = src["name"] or "(sin nombre)"

        if not signature:
            stats["invalid_source"] += 1
            continue

        dst = None
        matched_by = ""

        if code and code in dst_by_code:
            dst = dst_by_code[code]
            matched_by = "code"
        elif email and email in dst_by_email:
            dst = dst_by_email[email]
            matched_by = "email"

        if not dst:
            print(f"  [NO-MATCH] {name} | code={code or '-'} | email={email or '-'}")
            stats["no_match"] += 1
            continue

        dst_id = dst.get("_id")
        if dst_id in seen_dest_ids:
            continue
        seen_dest_ids.add(dst_id)

        dst_signature = _normalize_signature(dst.get("signature"))

        if dst_signature == signature:
            stats["same_signature"] += 1
            continue

        if (not force) and (not _is_missing_signature(dst_signature)):
            stats["already_with_signature"] += 1
            continue

        dst_email = _safe_lower(dst.get("email"))
        if dry_run:
            print(
                f"  [UPDATE-DRY] {dst_email:40} <- firma ({matched_by})"
            )
            stats["would_update"] += 1
            continue

        try:
            result = dst_users.update_one(
                {"_id": dst_id},
                {"$set": {"signature": signature}},
            )
            if result.modified_count > 0:
                print(f"  [UPDATE] {dst_email:40} <- firma ({matched_by})")
                stats["updated"] += 1
            else:
                stats["same_signature"] += 1
        except Exception as exc:
            print(f"  [ERROR] {dst_email}: {exc}")
            stats["errors"] += 1

    atlas.close()
    dest.close()

    print("\n" + "-" * 72)
    print("RESULTADO")
    print("-" * 72)
    print(f"  Actualizadas                 : {stats['updated']}")
    print(f"  Actualizables (dry-run)      : {stats['would_update']}")
    print(f"  Ya tenían firma (sin force)  : {stats['already_with_signature']}")
    print(f"  Firma idéntica               : {stats['same_signature']}")
    print(f"  Sin match en destino         : {stats['no_match']}")
    print(f"  Fuentes inválidas            : {stats['invalid_source']}")
    print(f"  Errores                      : {stats['errors']}")
    if dry_run:
        print("\n  DRY-RUN: ningún cambio realizado.")
    print("=" * 72)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sincroniza firmas de patólogos desde Atlas hacia perfiles existentes"
    )
    parser.add_argument("--dry-run", action="store_true", help="Simula sin escribir cambios")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Sobrescribe firma destino aunque ya tenga valor",
    )
    parser.add_argument("--atlas-url", default=ATLAS_URL, help="MongoDB URI origen")
    parser.add_argument("--atlas-db", default=ATLAS_DB, help="Base de datos origen")
    parser.add_argument("--dest-url", default=LOCAL_URL, help="MongoDB URI destino")
    parser.add_argument("--dest-db", default=LOCAL_DB, help="Base de datos destino")
    args = parser.parse_args()

    run(
        dry_run=args.dry_run,
        force=args.force,
        atlas_url=args.atlas_url,
        atlas_db=args.atlas_db,
        dest_url=args.dest_url,
        dest_db=args.dest_db,
    )


if __name__ == "__main__":
    main()
