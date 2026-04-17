"""
Cuenta casos ingresados en un mes (por defecto marzo) en estado Completado
excluyendo el catálogo Hospital Alma Máter (003 / HAMA), alineado con
`app.core.alma_mater_exclusion` (no excluye línea Renales* aunque diga Alma Mater).

Fecha de ingreso: date_info.0.created_at

Uso:
    MONGO_URI=mongodb://localhost:27017/pathsys python count_cases_march_completed_not_alma.py
    python count_cases_march_completed_not_alma.py --year 2025 --month 3
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import UTC, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from pymongo import MongoClient

_BACK_END_ROOT = Path(__file__).resolve().parents[1]
if str(_BACK_END_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACK_END_ROOT))

from app.core.alma_mater_exclusion import nor_list_completed_not_alma_mater

CO = ZoneInfo("America/Bogota")


def _db_from_uri(uri: str) -> str:
    if "/" in uri:
        part = uri.rsplit("/", 1)[-1]
        return part.split("?")[0] or "pathsys"
    return os.environ.get("DATABASE_NAME", "pathsys")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--month", type=int, default=3, help="1-12, ej. 3 = marzo")
    args = parser.parse_args()

    uri = os.environ.get("MONGO_URI", os.environ.get("MONGODB_URI", "mongodb://localhost:27017/pathsys"))
    db_name = os.environ.get("DATABASE_NAME", _db_from_uri(uri))

    client = MongoClient(uri)
    db = client[db_name]

    y, m = args.year, args.month
    start = datetime(y, m, 1, 0, 0, 0, tzinfo=CO)
    if m == 12:
        end = datetime(y + 1, 1, 1, 0, 0, 0, tzinfo=CO)
    else:
        end = datetime(y, m + 1, 1, 0, 0, 0, tzinfo=CO)

    start_utc = start.astimezone(UTC)
    end_utc = end.astimezone(UTC)

    query: dict = {
        "state": "Completado",
        "date_info.0.created_at": {"$gte": start_utc, "$lt": end_utc},
        "$nor": nor_list_completed_not_alma_mater(db.entities),
    }

    total = db.cases.count_documents(query)

    print(f"Base de datos: {db_name}")
    print(
        f"Periodo ingreso (created_at): {start.date()} .. antes de {end.date()} "
        f"(calendario Colombia → consulta en UTC: {start_utc.isoformat()} .. {end_utc.isoformat()})"
    )
    print("Estado: Completado")
    print("Exclusión: entity del caso (id 003 + nombre); no patient_info.entity_info.")
    print()
    print(f"Total casos: {total}")

    client.close()


if __name__ == "__main__":
    main()
