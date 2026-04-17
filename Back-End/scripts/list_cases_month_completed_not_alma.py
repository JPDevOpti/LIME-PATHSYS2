"""
Lista casos del mes civil (Colombia) en Completado, excluyendo Alma Máter
con el mismo criterio que `app.core.alma_mater_exclusion` (Renales Hospital Alma Mater no se excluye).

Imprime el total y una línea por caso (código, fecha ingreso, entidad caso, EPS paciente).

Uso:
    MONGO_URI=mongodb://localhost:27017/pathsys python list_cases_month_completed_not_alma.py
    python list_cases_month_completed_not_alma.py --year 2026 --month 3
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


def _month_range_utc(year: int, month: int) -> tuple[datetime, datetime]:
    start_co = datetime(year, month, 1, 0, 0, 0, tzinfo=CO)
    if month == 12:
        end_co = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=CO)
    else:
        end_co = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=CO)
    return start_co.astimezone(UTC), end_co.astimezone(UTC)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--month", type=int, default=3, help="1-12, ej. 3 = marzo")
    args = parser.parse_args()

    uri = os.environ.get("MONGO_URI", os.environ.get("MONGODB_URI", "mongodb://localhost:27017/pathsys"))
    db_name = os.environ.get("DATABASE_NAME", _db_from_uri(uri))

    client = MongoClient(uri)
    db = client[db_name]

    start_utc, end_utc = _month_range_utc(args.year, args.month)

    query: dict = {
        "state": "Completado",
        "date_info.0.created_at": {"$gte": start_utc, "$lt": end_utc},
        "$nor": nor_list_completed_not_alma_mater(db.entities),
    }

    projection = {
        "case_code": 1,
        "state": 1,
        "entity": 1,
        "patient_info.entity_info": 1,
        "date_info": {"$slice": 1},
    }

    cursor = db.cases.find(query, projection).sort("case_code", 1)
    docs = list(cursor)

    mes_nombre = {
        1: "enero",
        2: "febrero",
        3: "marzo",
        4: "abril",
        5: "mayo",
        6: "junio",
        7: "julio",
        8: "agosto",
        9: "septiembre",
        10: "octubre",
        11: "noviembre",
        12: "diciembre",
    }.get(args.month, str(args.month))

    print(f"Base de datos: {db_name}")
    print(
        f"Mes: {mes_nombre} {args.year} | created_at (date_info.0): "
        f"{start_utc.isoformat()} .. {end_utc.isoformat()} (UTC)"
    )
    print("Estado: Completado")
    print("Exclusión: solo entity.id (003) y entity.name (Renales* no penaliza).")
    print()
    print(f"Total casos (lista siguiente): {len(docs)}")
    print("-" * 100)

    for i, doc in enumerate(docs, start=1):
        code = doc.get("case_code") or ""
        ent = doc.get("entity") or {}
        ent_id = ent.get("id") if isinstance(ent, dict) else None
        ent_name = ent.get("name") if isinstance(ent, dict) else ""
        pi = doc.get("patient_info") or {}
        ei = pi.get("entity_info") or {}
        eps_name = ei.get("entity_name") or ""
        di = (doc.get("date_info") or [{}])[0] if doc.get("date_info") else {}
        created = di.get("created_at")
        if hasattr(created, "isoformat"):
            created_s = created.isoformat()
        else:
            created_s = str(created)

        ent_id_s = str(ent_id) if ent_id is not None else ""

        print(
            f"{i:4d}. {code} | ingreso: {created_s} | entity.id={ent_id_s} | "
            f"entity.name={ent_name!r} | paciente.entity_name={eps_name!r}"
        )

    print("-" * 100)
    print(f"Fin lista: {len(docs)} casos.")

    client.close()


if __name__ == "__main__":
    main()
