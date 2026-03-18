#!/usr/bin/env python3
"""
Migra el campo `entity` de los casos del formato string al nuevo formato objeto {id, name}.

Para cada caso:
1. Si entity es un string → lo convierte a {id: ObjectId, name: string}
   buscando la entidad por nombre en la colección entities.
2. Si entity no existe → lo pobla desde patient_info.entity_info.entity_name.
3. Si entity ya es un dict → lo deja como está (ya migrado).

Uso:
    python3 migrate_entity_to_object.py [--dry-run] [--dest-url MONGO_URI] [--dest-db DB_NAME]

Opciones:
    --dry-run   Solo muestra lo que haría sin modificar la base de datos
    --dest-url  URI de MongoDB (default: MONGODB_URI env o mongodb://localhost:27017)
    --dest-db   Nombre de la base de datos (default: MONGODB_DB env o pathsys)
"""

import argparse
import os
import re
from typing import Any

from pymongo import MongoClient
from pymongo.database import Database


DEFAULT_URL = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
DEFAULT_DB = os.environ.get("MONGODB_DB", "pathsys")


def get_db(dest_url: str, dest_db: str) -> Database:
    client: MongoClient = MongoClient(dest_url)
    return client[dest_db]


def build_entity_lookup(db: Database) -> dict[str, str]:
    """
    Construye un mapa {nombre_normalizado: entity_id} desde la colección entities.
    Normaliza los nombres a minúsculas y sin espacios extra para mejor matching.
    """
    entities_col = db["entities"]
    lookup: dict[str, str] = {}
    for ent in entities_col.find({}, {"_id": 1, "name": 1}):
        name = str(ent.get("name") or "").strip()
        if name:
            key = re.sub(r"\s+", " ", name.lower().strip())
            lookup[key] = str(ent["_id"])
    return lookup


def find_entity_id(name: str, lookup: dict[str, str]) -> str | None:
    """Busca el id de la entidad por nombre normalizado."""
    if not name:
        return None
    key = re.sub(r"\s+", " ", name.lower().strip())
    return lookup.get(key)


def migrate(db: Database, dry_run: bool = False) -> None:
    cases_col = db["cases"]
    lookup = build_entity_lookup(db)

    print(f"Entidades en catálogo: {len(lookup)}")
    print(f"Modo: {'DRY-RUN (sin cambios)' if dry_run else 'EJECUCIÓN REAL'}")
    print("-" * 60)

    # Buscar casos que necesitan migración:
    # 1. entity es string (no es dict/object)
    # 2. entity no existe
    # 3. entity es null
    query: dict[str, Any] = {
        "$or": [
            {"entity": {"$type": "string"}},
            {"entity": {"$exists": False}},
            {"entity": None},
        ]
    }

    total = cases_col.count_documents(query)
    print(f"Casos a migrar: {total}")

    if total == 0:
        print("No hay casos que migrar.")
        return

    migrated = 0
    skipped = 0
    no_entity_name = 0
    no_entity_id = 0

    cursor = cases_col.find(query, {
        "_id": 1,
        "case_code": 1,
        "entity": 1,
        "patient_info.entity_info.entity_name": 1,
    })

    for doc in cursor:
        case_id = doc["_id"]
        case_code = doc.get("case_code", "???")
        raw_entity = doc.get("entity")

        # Determinar el nombre de la entidad
        if isinstance(raw_entity, str) and raw_entity.strip():
            entity_name = raw_entity.strip()
        else:
            # Intentar poblar desde patient_info
            pi = doc.get("patient_info") or {}
            ei = pi.get("entity_info") or {}
            entity_name = (ei.get("entity_name") or "").strip()

        if not entity_name:
            no_entity_name += 1
            # Aún así actualizar a objeto vacío para consistencia
            new_entity = {"id": None, "name": ""}
        else:
            entity_id = find_entity_id(entity_name, lookup)
            if not entity_id:
                no_entity_id += 1
            new_entity = {"id": entity_id, "name": entity_name}

        if dry_run:
            id_display = new_entity["id"] or "NO ENCONTRADO"
            print(f"  [DRY-RUN] {case_code}: \"{raw_entity}\" → {{id: {id_display}, name: \"{new_entity['name']}\"}}")
        else:
            cases_col.update_one(
                {"_id": case_id},
                {"$set": {"entity": new_entity}},
            )

        migrated += 1

    print("-" * 60)
    print(f"Total procesados: {migrated}")
    print(f"Sin nombre de entidad: {no_entity_name}")
    print(f"Sin id encontrado en catálogo: {no_entity_id}")
    if not dry_run:
        print(f"Casos actualizados exitosamente: {migrated}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Migra el campo entity de string a objeto {id, name}"
    )
    parser.add_argument("--dest-url", default=DEFAULT_URL, help="MongoDB URI")
    parser.add_argument("--dest-db", default=DEFAULT_DB, help="Database name")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo muestra lo que haría sin modificar la base de datos",
    )
    args = parser.parse_args()

    db = get_db(args.dest_url, args.dest_db)
    migrate(db, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
