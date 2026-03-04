#!/usr/bin/env python3
"""
Script para importar administradores del sistema.

Crea usuarios administrador en la base de datos con las credenciales indicadas.
Los administradores tienen acceso completo al sistema.

Variables de entorno (opcionales):
    MONGODB_URI o MONGODB_URL: URI de MongoDB (ej: mongodb://localhost:27017)
    DATABASE_NAME: Nombre de la base (ej: pathsys)

Uso:
    python scripts/import_administrators.py [--dry-run]

Argumentos:
    --dry-run: Solo muestra lo que se haria sin ejecutar cambios reales
"""

import argparse
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Compatibilidad con .env del sistema antiguo
if os.getenv("MONGODB_URL") and not os.getenv("MONGODB_URI"):
    os.environ["MONGODB_URI"] = os.environ["MONGODB_URL"]

from app.database import get_db
from app.security import get_password_hash

_SEED_FILE = os.path.join(os.path.dirname(__file__), "admins_seed.json")

def _load_administrators():
    if not os.path.exists(_SEED_FILE):
        print(f"ERROR: Archivo de seed no encontrado: {_SEED_FILE}")
        print(f"       Copia admins_seed.example.json a admins_seed.json y completa las credenciales.")
        sys.exit(1)
    with open(_SEED_FILE, encoding="utf-8") as f:
        return json.load(f)

ADMINISTRATORS = _load_administrators()


def check_email_exists(collection, email: str) -> bool:
    doc = collection.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
    return doc is not None


def create_administrators(dry_run: bool = False) -> None:
    try:
        db = get_db()
        db.command("ping")
    except Exception as e:
        print(f"Error de conexion a MongoDB: {e}")
        print("Verifique que MongoDB este corriendo y que MONGODB_URI/MONGODB_URL sea correcto.")
        sys.exit(1)

    collection = db.get_collection("users")

    created = 0
    skipped = 0
    errors = 0

    print("=" * 60)
    print("IMPORTACION DE ADMINISTRADORES")
    print("=" * 60)
    print(f"Modo: {'DRY-RUN (sin cambios)' if dry_run else 'EJECUCION REAL'}")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total a procesar: {len(ADMINISTRATORS)}")
    print("=" * 60)

    for i, admin_data in enumerate(ADMINISTRATORS, 1):
        name = admin_data.get("name", "").strip()
        email = admin_data.get("email", "").strip()
        password = admin_data.get("password", "")
        custom_code = admin_data.get("code")

        print(f"\n[{i}/{len(ADMINISTRATORS)}] Procesando: {name}")
        print(f"  Email: {email}")
        print(f"  Rol: administrator")

        try:
            if not name:
                print("  [OMITIR] Nombre vacio o invalido")
                skipped += 1
                continue

            if not email:
                print("  [OMITIR] Email vacio o invalido")
                skipped += 1
                continue

            if not password or len(password) < 6:
                print("  [OMITIR] La contrasena debe tener al menos 6 caracteres")
                skipped += 1
                continue

            if check_email_exists(collection, email):
                print("  [OMITIR] El usuario ya existe en la base de datos")
                skipped += 1
                continue

            if dry_run:
                print("  [DRY-RUN] Se crearia el administrador")
                print(f"    - Email: {email}")
                print(f"    - Rol: administrator")
                print(f"    - Estado: activo")
                created += 1
            else:
                admin_code = custom_code or name.replace(" ", "_").lower()[:20]
                password_hash = get_password_hash(password)
                user_data = {
                    "name": name,
                    "email": email,
                    "role": "administrator",
                    "password_hash": password_hash,
                    "is_active": True,
                    "administrator_code": admin_code,
                }
                result = collection.insert_one(user_data)
                if result.inserted_id:
                    print("  [OK] Administrador creado correctamente")
                    print(f"    - ID: {result.inserted_id}")
                    print(f"    - Email: {email}")
                    print(f"    - Rol: administrator")
                    created += 1
                else:
                    print("  [ERROR] No se pudo crear el administrador")
                    errors += 1

        except ValueError as e:
            print(f"  [OMITIR] Error de validacion: {e}")
            skipped += 1
        except Exception as e:
            print(f"  [ERROR] Error inesperado: {e}")
            errors += 1

    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"Total procesados: {len(ADMINISTRATORS)}")
    print(f"Creados: {created}")
    print(f"Omitidos: {skipped}")
    print(f"Errores: {errors}")

    if dry_run:
        print("\nModo DRY-RUN: no se realizaron cambios en la base de datos")
        print("Para ejecutar de verdad, ejecute el script sin --dry-run")
    else:
        print("\nImportacion completada")

    print("=" * 60)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Importar administradores del sistema",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  python scripts/import_administrators.py --dry-run   # Solo mostrar que se haria
  python scripts/import_administrators.py            # Ejecutar de verdad
        """,
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo mostrar que se haria sin ejecutar cambios",
    )
    args = parser.parse_args()
    create_administrators(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
