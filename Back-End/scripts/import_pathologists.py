#!/usr/bin/env python3
"""
Script to import pathologists into the system.

Creates pathologist users in the users collection with unified data (no separate
pathologists collection). Pathologists can log in and access cases assigned to them.

Environment variables (optional):
    MONGODB_URI or MONGODB_URL: MongoDB URI (e.g. mongodb://localhost:27017)
    DATABASE_NAME: Database name (e.g. pathsys)

Usage:
    python scripts/import_pathologists.py [--dry-run]

Arguments:
    --dry-run: Only show what would be done without executing changes
"""

import argparse
import os
import sys
from datetime import datetime
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if os.getenv("MONGODB_URL") and not os.getenv("MONGODB_URI"):
    os.environ["MONGODB_URI"] = os.environ["MONGODB_URL"]

from app.database import get_db
from app.security import get_password_hash

PATHOLOGISTS = [
    {"raw_code": "32108690", "raw_name": "Leiby Alejandra Medina Zuluaica", "raw_siglas": "LAM", "registro_medico": "R-05-0816", "email": "leiby.medina@udea.edu.co"},
    {"raw_code": "71589374", "raw_name": "Juan Carlos Arango Viana", "raw_siglas": "JCA", "registro_medico": "R-9745-87", "email": "jcarlos.arango@udea.edu.co"},
    {"raw_code": "43617501", "raw_name": "Carolina Lopez Uran", "raw_siglas": "CLU", "registro_medico": "R-1543901", "email": "carolina.lopezu@udea.edu.co"},
    {"raw_code": "1129564009", "raw_name": "Vanessa Santiago Pacheco", "raw_siglas": "VSP", "registro_medico": "R-5-6088-09", "email": "vanessa.santiago@udea.edu.co"},
    {"raw_code": "32259741", "raw_name": "Alejandra Taborda Murillo", "raw_siglas": "ATM", "registro_medico": "R-5-0967-09", "email": "alejandra.tabordam@udea.edu.co"},
    {"raw_code": "72257523", "raw_name": "Ariel Antonio Arteta Cueto", "raw_siglas": "AAA", "registro_medico": "R-13008141-5", "email": "ariel.arteta@udea.edu.co"},
    {"raw_code": "71666530", "raw_name": "Miguel Ignacio Roldan Perez", "raw_siglas": "MRP", "registro_medico": "R-36793", "email": "mirope65@yahoo.com"},
    {"raw_code": "30582655", "raw_name": "Dilia Rosa Diaz Macea", "raw_siglas": "DRD", "registro_medico": "R-5-1161-10", "email": "diliadiazm@yahoo.com"},
    {"raw_code": "1144050050", "raw_name": "Luis Eduardo Munoz Rayo", "raw_siglas": "LEM", "registro_medico": "R-1144050050", "email": "luis.munoz2@udea.edu.co"},
    {"raw_code": "1017233614", "raw_name": "Janine Orejuela Erazo", "raw_siglas": "JOE", "registro_medico": "R-1017233614", "email": "janine.orejuela@udea.edu.co"},
    {"raw_code": "1102849456", "raw_name": "Emil de Jesus Jimenez Berastegui", "raw_siglas": "EJB", "registro_medico": "R-1102849456", "email": "emil.jimenezb@udea.edu.co"},
    {"raw_code": "1036636079", "raw_name": "Julieth Alexandra Franco Mira", "raw_siglas": "JFM", "registro_medico": "R-1036636079", "email": "juliethfranco13@gmail.com"},
    {"raw_code": "1130613519", "raw_name": "Andres Lozano Camayo", "raw_siglas": "ALC", "registro_medico": "R-1130613519", "email": "feloza@gmail.com"},
    {"raw_code": "70092000", "raw_name": "German de Jesus Osorio Sandoval", "raw_siglas": "GOS", "registro_medico": "R-2863", "email": "osoriosandoval2000@yahoo.es"},
    {"raw_code": "71749611", "raw_name": "Andres Felipe Covo Sandoval", "raw_siglas": "ABC", "registro_medico": "R-76-4975", "email": "afelipe.bernal@udea.edu.co"},
]


def derive_initials(raw_initials: Optional[str], raw_name: str) -> str:
    if raw_initials and str(raw_initials).strip():
        return str(raw_initials).strip().upper()
    parts = [p for p in str(raw_name).strip().split() if p]
    return ("".join(p[0] for p in parts)[:4]).upper() if parts else "XX"


def generate_default_password(code: str, initials: str) -> str:
    password = code
    if len(password) < 6:
        password = f"{code}{initials}"
        if len(password) < 6:
            password = password.ljust(6, "0")
    return password[:128]


def compose_email(code: str, initials: str) -> str:
    return f"{code}.{(initials or '').lower()}@udea.edu.co"


def check_email_exists(collection, email: str) -> bool:
    doc = collection.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
    return doc is not None


def check_pathologist_code_exists(collection, pathologist_code: str) -> bool:
    doc = collection.find_one({"pathologist_code": pathologist_code})
    return doc is not None


def create_pathologists(dry_run: bool = False) -> None:
    try:
        db = get_db()
        db.command("ping")
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        print("Verify MongoDB is running and MONGODB_URI/MONGODB_URL is correct.")
        sys.exit(1)

    collection = db.get_collection("users")

    created = 0
    skipped = 0
    errors = 0

    print("=" * 60)
    print("PATHOLOGIST IMPORT")
    print("=" * 60)
    print(f"Mode: {'DRY-RUN (no changes)' if dry_run else 'REAL EXECUTION'}")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total to process: {len(PATHOLOGISTS)}")
    print("=" * 60)

    for i, row in enumerate(PATHOLOGISTS, 1):
        raw_code = str(row.get("raw_code", "")).strip()
        raw_name = str(row.get("raw_name", "")).strip()
        raw_siglas = row.get("raw_siglas")
        registro_medico = str(row.get("registro_medico") or "").strip() or f"PEND-{raw_code}"
        email = str(row.get("email") or "").strip() or compose_email(raw_code, derive_initials(raw_siglas, raw_name))

        print(f"\n[{i}/{len(PATHOLOGISTS)}] Processing: {raw_name}")
        print(f"  Code: {raw_code}")
        print(f"  Email: {email}")

        try:
            if not raw_code or not raw_name:
                print("  [SKIP] Empty code or name")
                skipped += 1
                continue

            if len(raw_code) > 11:
                print(f"  [SKIP] Code must have max 11 characters (current: {len(raw_code)})")
                skipped += 1
                continue

            if len(raw_name) > 100:
                print(f"  [SKIP] Name must have max 100 characters (current: {len(raw_name)})")
                skipped += 1
                continue

            initials = derive_initials(raw_siglas, raw_name)
            if len(initials) > 10:
                print(f"  [SKIP] Initials must have max 10 characters (current: {len(initials)})")
                skipped += 1
                continue

            if not email:
                print("  [SKIP] Empty or invalid email")
                skipped += 1
                continue

            if check_email_exists(collection, email):
                print("  [SKIP] User with this email already exists")
                skipped += 1
                continue

            if check_pathologist_code_exists(collection, raw_code):
                print("  [SKIP] User with this pathologist code already exists")
                skipped += 1
                continue

            default_password = generate_default_password(raw_code, initials)
            if len(default_password) < 6:
                print(f"  [ERROR] Generated password too short (min 6 chars)")
                errors += 1
                continue

            if dry_run:
                print("  [DRY-RUN] Would create pathologist user")
                print(f"    - Code: {raw_code}")
                print(f"    - Email: {email}")
                print(f"    - Initials: {initials}")
                print(f"    - Medical License: {registro_medico}")
                print(f"    - Role: pathologist")
                print(f"    - Password: {default_password} (would be hashed)")
                created += 1
            else:
                password_hash = get_password_hash(default_password)
                user_data = {
                    "name": raw_name,
                    "email": email,
                    "password_hash": password_hash,
                    "role": "pathologist",
                    "is_active": True,
                    "pathologist_code": raw_code,
                    "medical_license": registro_medico,
                    "initials": initials,
                    "signature": "",
                    "observations": None,
                }
                result = collection.insert_one(user_data)
                if result.inserted_id:
                    print("  [OK] Pathologist created successfully")
                    print(f"    - ID: {result.inserted_id}")
                    print(f"    - Code: {raw_code}")
                    print(f"    - Email: {email}")
                    print(f"    - Role: pathologist")
                    created += 1
                else:
                    print("  [ERROR] Failed to create pathologist")
                    errors += 1

        except ValueError as e:
            print(f"  [SKIP] Validation error: {e}")
            skipped += 1
        except Exception as e:
            print(f"  [ERROR] Unexpected error: {e}")
            errors += 1

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total processed: {len(PATHOLOGISTS)}")
    print(f"Created: {created}")
    print(f"Skipped: {skipped}")
    print(f"Errors: {errors}")

    if dry_run:
        print("\nDRY-RUN mode: no changes were made to the database")
        print("To execute for real, run the script without --dry-run")
    else:
        print("\nImport completed")

    print("=" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import pathologists into the system",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/import_pathologists.py --dry-run   # Only show what would be done
  python scripts/import_pathologists.py            # Execute for real
        """,
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only show what would be done without executing changes",
    )
    args = parser.parse_args()
    create_pathologists(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
