#!/usr/bin/env python3
"""
Importa CIE-O morfológico desde CSV con formato: código,nombre (ej. 8000/3,"Neoplasia, maligna").

Elimina todos los registros CIEO anteriores (colección diseases + colección cieo) y los reemplaza.

Uso:
    python scripts/import_cieo_from_csv.py [--dry-run] [--dest-url MONGO_URI] [--dest-db DB_NAME]

Ejemplos:
    # Local
    python scripts/import_cieo_from_csv.py

    # Atlas
    python scripts/import_cieo_from_csv.py --dest-url "mongodb+srv://user:pass@cluster.mongodb.net" --dest-db pathsys
"""

import argparse
import csv
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from pymongo import MongoClient
from pymongo.database import Database


DEFAULT_URL = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
DEFAULT_DB = os.environ.get("MONGODB_DB", "pathsys")


def get_db(dest_url: str, dest_db: str) -> Database:
    client: MongoClient = MongoClient(
        dest_url,
        serverSelectionTimeoutMS=10000,
        connectTimeoutMS=10000,
        socketTimeoutMS=30000,
        tls=True if "mongodb+srv" in dest_url else None,
    )
    return client[dest_db]


def normalize_text(text: str | None) -> str | None:
    if text is None or (isinstance(text, str) and not text.strip()):
        return None
    return " ".join(str(text).split()).strip()


def process_csv(file_path: Path) -> list[dict]:
    """Lee CSV con formato: código,nombre. Sin encabezado."""
    diseases: list[dict] = []
    seen: set[str] = set()

    with open(file_path, encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 2:
                continue
            code = normalize_text(row[0])
            name = normalize_text(row[1])
            if not code or not name:
                continue

            # Clave única: código + nombre para evitar duplicados exactos
            key = f"{code}|{name}"
            if key in seen:
                continue
            seen.add(key)

            diseases.append({
                "table": "CIEO",
                "code": code,
                "name": name,
                "description": name,
                "is_active": True,
            })

    return diseases


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Importa CIE-O morfológico desde CSV. Elimina los anteriores y los reemplaza."
    )
    parser.add_argument("--dest-url", default=DEFAULT_URL, help="MongoDB URI")
    parser.add_argument("--dest-db", default=DEFAULT_DB, help="Database name")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo muestra lo que haría sin modificar la base de datos",
    )
    args = parser.parse_args()

    # Buscar el CSV
    script_dir = Path(__file__).resolve().parent
    csv_path = script_dir / "CIE -O.csv"
    if not csv_path.exists():
        csv_path = script_dir / "CIE-O.csv"
    if not csv_path.exists():
        print("ERROR: No se encontró el archivo 'CIE -O.csv' en Back-End/scripts/")
        sys.exit(1)

    diseases = process_csv(csv_path)
    if not diseases:
        print("ERROR: El CSV no contiene datos válidos.")
        sys.exit(1)

    total = len(diseases)
    print("=" * 60)
    print("IMPORTACIÓN CIE-O MORFOLÓGICO")
    print("=" * 60)
    print(f"Fecha        : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Fuente       : {csv_path}")
    print(f"Registros    : {total}")
    print(f"Modo         : {'DRY-RUN (sin cambios)' if args.dry_run else 'EJECUCIÓN REAL'}")
    print(f"Destino      : {args.dest_url} / {args.dest_db}")
    print("=" * 60)

    if args.dry_run:
        for i, d in enumerate(diseases[:20], 1):
            print(f"  [{i:>5}] {d['code']:<12} - {d['name'][:55]}")
        if total > 20:
            print(f"  ... y {total - 20} más")
        print("=" * 60)
        print(f"[DRY-RUN] Se eliminarían los CIEO existentes y se insertarían {total} registros nuevos.")
        return

    print("Conectando a MongoDB...", flush=True)
    db = get_db(args.dest_url, args.dest_db)
    try:
        db.command("ping")
        print("Conexión a MongoDB: OK", flush=True)
    except Exception as e:
        print(f"Error de conexión a MongoDB: {e}")
        sys.exit(1)

    diseases_col = db.get_collection("diseases")

    # 1. Eliminar CIEO de la colección diseases (sin regex, directo)
    print("Eliminando CIEO de 'diseases'...", flush=True)
    deleted_diseases = diseases_col.delete_many({"table": "CIEO"}).deleted_count
    print(f"Eliminados de 'diseases': {deleted_diseases}", flush=True)

    # 2. Eliminar toda la colección cieo (alternativa/legacy)
    print("Eliminando colección 'cieo'...", flush=True)
    cieo_col = db.get_collection("cieo")
    deleted_cieo = cieo_col.delete_many({}).deleted_count
    print(f"Eliminados de 'cieo'    : {deleted_cieo}", flush=True)
    print("-" * 60)

    # 3. Insertar nuevos registros
    now = datetime.now(timezone.utc).isoformat()
    for d in diseases:
        d["created_at"] = now
        d["updated_at"] = now

    batch = 500
    created = 0
    for start in range(0, len(diseases), batch):
        chunk = diseases[start : start + batch]
        diseases_col.insert_many(chunk, ordered=False)
        created += len(chunk)
        print(f"  Insertados: {created}/{total}")

    print("=" * 60)
    print(f"Completado. {created} registros CIE-O morfológico importados.")
    print("=" * 60)


if __name__ == "__main__":
    main()
