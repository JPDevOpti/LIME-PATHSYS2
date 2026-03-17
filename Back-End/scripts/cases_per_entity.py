#!/usr/bin/env python3
"""
Cuenta cuántos casos hay por entidad en la base de datos
y los imprime ordenados de mayor a menor.

Uso:
    python3 cases_per_entity.py [--dest-url MONGO_URI] [--dest-db DB_NAME]

Valores por defecto:
    --dest-url: MONGODB_URI o mongodb://localhost:27017
    --dest-db : pathsys
"""

import argparse
import os
from typing import Any

from pymongo import MongoClient
from pymongo.database import Database


DEFAULT_URL = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
DEFAULT_DB = os.environ.get("MONGODB_DB", "pathsys")


def get_db(dest_url: str, dest_db: str) -> Database:
    client = MongoClient(dest_url)
    return client[dest_db]


def count_cases_by_entity(db: Database) -> list[dict[str, Any]]:
    """
    Agrupa en la colección cases por entidad y cuenta cuántos casos tiene cada una.
    Usa patient_info.entity_info.entity_name como nombre principal de entidad.
    """
    cases = db["cases"]

    pipeline = [
        {
            "$group": {
                "_id": "$patient_info.entity_info.entity_name",
                "total": {"$sum": 1},
            }
        },
        {"$sort": {"total": -1}},
    ]

    raw = list(cases.aggregate(pipeline))
    results: list[dict[str, Any]] = []
    for r in raw:
        name = r.get("_id") or "Sin entidad"
        total = r.get("total", 0)
        results.append({"name": name, "total": total})
    return results


def main(dest_url: str, dest_db: str) -> None:
    print("=" * 70)
    print("  CASOS POR ENTIDAD")
    print("=" * 70)
    print(f"  URI : {dest_url}")
    print(f"  DB  : {dest_db}")
    print()

    client = MongoClient(dest_url, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    db = client[dest_db]

    results = count_cases_by_entity(db)

    if not results:
        print("No se encontraron casos en la colección 'cases'.")
    else:
        print(f"{'Casos':>8}  Entidad")
        print("-" * 70)
        for item in results:
            print(f"{item['total']:8d}  {item['name']}")

    client.close()
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Cuenta cuántos casos hay por entidad y los imprime."
    )
    parser.add_argument(
        "--dest-url",
        default=DEFAULT_URL,
        help="MongoDB URI destino (por defecto MONGODB_URI o mongodb://localhost:27017)",
    )
    parser.add_argument(
        "--dest-db",
        default=DEFAULT_DB,
        help="Nombre de la base de datos (por defecto pathsys o MONGODB_DB).",
    )
    args = parser.parse_args()
    main(dest_url=args.dest_url, dest_db=args.dest_db)

