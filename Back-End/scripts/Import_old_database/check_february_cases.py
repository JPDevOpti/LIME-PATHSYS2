#!/usr/bin/env python3
"""
Verifica los casos y pacientes únicos del mes de febrero 2026
para comparar contra los KPIs del dashboard.

Usa la misma query que DashboardRepository.get_metrics():
  date_info.0.created_at >= 2026-02-01T00:00:00Z
  date_info.0.created_at <  2026-03-01T00:00:00Z

Uso:
    python scripts/Import_old_database/check_february_cases.py
    python scripts/Import_old_database/check_february_cases.py --year 2025 --month 2
"""

import argparse
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import get_db

YEAR = 2026
MONTH = 2


def calendar_month_range(year: int, month: int):
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    return start, end


def run(year: int, month: int):
    db = get_db()
    db.command("ping")

    cases = db["cases"]

    start, end = calendar_month_range(year, month)
    query = {"date_info.0.created_at": {"$gte": start, "$lt": end}}

    month_names = {
        1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
        5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
        9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
    }

    print("=" * 70)
    print(f"CASOS DE {month_names.get(month, month)} {year}")
    print(f"Rango: {start.isoformat()} → {end.isoformat()}")
    print("=" * 70)

    total_casos = cases.count_documents(query)
    patient_ids = cases.distinct("patient_info.patient_id", query)
    total_pacientes = len(patient_ids)

    print(f"\nRESUMEN KPI")
    print(f"  Casos    (mes_actual): {total_casos}")
    print(f"  Pacientes(mes_actual): {total_pacientes}")

    print(f"\n{'#':<5} {'case_code':<20} {'created_at':<28} {'patient_id':<30} {'patient_name'}")
    print("-" * 110)

    cursor = cases.find(query, {
        "case_code": 1,
        "date_info": 1,
        "patient_info.patient_id": 1,
        "patient_info.full_name": 1,
        "patient_info.identification_number": 1,
        "state": 1,
    }).sort("date_info.0.created_at", 1)

    for i, doc in enumerate(cursor, 1):
        code = doc.get("case_code", "—")
        date_info = doc.get("date_info", [{}])
        created_at = date_info[0].get("created_at", "") if date_info else ""
        if isinstance(created_at, datetime):
            created_str = created_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        else:
            created_str = str(created_at)

        patient_info = doc.get("patient_info", {})
        patient_id = str(patient_info.get("patient_id", "—"))
        name = patient_info.get("full_name", "—")
        state = doc.get("state", "—")

        print(f"{i:<5} {code:<20} {created_str:<28} {patient_id:<30} {name}  [{state}]")

    print("-" * 110)
    print(f"Total casos: {total_casos}  |  Pacientes únicos: {total_pacientes}")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="Verificar casos de un mes para comparar con KPIs")
    parser.add_argument("--year", type=int, default=YEAR)
    parser.add_argument("--month", type=int, default=MONTH)
    args = parser.parse_args()
    run(args.year, args.month)


if __name__ == "__main__":
    main()
