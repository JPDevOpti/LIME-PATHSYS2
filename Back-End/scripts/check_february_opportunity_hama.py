#!/usr/bin/env python3
"""
Verifica oportunidad de casos ingresados en febrero, comparando:
  - conteo incluyendo HAMA
  - conteo excluyendo HAMA

Uso:
  python scripts/check_february_opportunity_hama.py --year 2026
  python scripts/check_february_opportunity_hama.py --year 2026 --month 2
  python scripts/check_february_opportunity_hama.py --mongo-uri mongodb://localhost:27017 --db pathsys
"""

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from pymongo import MongoClient

# Permite reutilizar configuración de la app
sys.path.insert(0, str(Path(__file__).parent.parent))

MONGO_URI = "mongodb://localhost:27017"
MONGO_DB = "pathsys"

try:
    from app.config import settings

    MONGO_URI = settings.MONGODB_URI
    MONGO_DB = settings.MONGODB_DB
except Exception:
    pass


def month_range(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    return start, end


def hama_exclusion_match() -> dict:
    entity_name_pattern = r"h[aá]ma|alma\s*m[aá]ter|alma\s*m[aá]ter\s*de\s*antioquia"
    return {
        "$nor": [
            {"patient_info.entity_info.entity_code": {"$regex": "^HAMA$", "$options": "i"}},
            {"patient_info.entity_info.code": {"$regex": "^HAMA$", "$options": "i"}},
            {"patient_info.entity_code": {"$regex": "^HAMA$", "$options": "i"}},
            {"entity_code": {"$regex": "^HAMA$", "$options": "i"}},
            {"entity": {"$regex": entity_name_pattern, "$options": "i"}},
            {"patient_info.entity_info.entity_name": {"$regex": entity_name_pattern, "$options": "i"}},
            {"patient_info.entity_info.name": {"$regex": entity_name_pattern, "$options": "i"}},
            {"patient_info.entity_name": {"$regex": entity_name_pattern, "$options": "i"}},
            {"patient_info.entity": {"$regex": entity_name_pattern, "$options": "i"}},
            {"institution": {"$regex": entity_name_pattern, "$options": "i"}},
        ]
    }


def pct(part: int, total: int) -> float:
    if total == 0:
        return 0.0
    return round((part / total) * 100, 2)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compara casos oportunos de febrero con/sin entidad HAMA"
    )
    parser.add_argument("--year", type=int, default=datetime.now(timezone.utc).year)
    parser.add_argument("--month", type=int, default=2, choices=range(1, 13))
    parser.add_argument("--mongo-uri", default=MONGO_URI)
    parser.add_argument("--db", default=MONGO_DB)
    args = parser.parse_args()

    start, end = month_range(args.year, args.month)

    base_match = {
        "date_info.0.created_at": {"$gte": start, "$lt": end},
        "state": "Completado",
    }

    client = MongoClient(args.mongo_uri)
    db = client[args.db]
    cases = db["cases"]

    # Con HAMA
    total_with_hama = cases.count_documents(base_match)
    timely_with_hama = cases.count_documents(
        {**base_match, "opportunity_info.0.was_timely": True}
    )

    # Sin HAMA
    exclusion = hama_exclusion_match()
    base_without_hama = {**base_match, **exclusion}
    total_without_hama = cases.count_documents(base_without_hama)
    timely_without_hama = cases.count_documents(
        {**base_without_hama, "opportunity_info.0.was_timely": True}
    )

    # Casos HAMA (diferencia)
    total_hama = max(total_with_hama - total_without_hama, 0)
    timely_hama = max(timely_with_hama - timely_without_hama, 0)

    month_label = f"{args.year}-{str(args.month).zfill(2)}"

    print("=" * 72)
    print(f"Verificación de oportunidad - mes de ingreso: {month_label}")
    print("(Solo casos completados, usando opportunity_info.0.was_timely)")
    print("=" * 72)

    print("\n[Incluyendo HAMA]")
    print(f"- Total casos completados: {total_with_hama}")
    print(f"- Casos oportunos:         {timely_with_hama}")
    print(f"- % oportunidad:           {pct(timely_with_hama, total_with_hama)}%")

    print("\n[Excluyendo HAMA]")
    print(f"- Total casos completados: {total_without_hama}")
    print(f"- Casos oportunos:         {timely_without_hama}")
    print(f"- % oportunidad:           {pct(timely_without_hama, total_without_hama)}%")

    print("\n[Solo HAMA (diferencia)]")
    print(f"- Total casos completados: {total_hama}")
    print(f"- Casos oportunos:         {timely_hama}")
    print(f"- % oportunidad:           {pct(timely_hama, total_hama)}%")

    print("\nRango UTC evaluado:")
    print(f"- Desde: {start.isoformat()}")
    print(f"- Hasta: {end.isoformat()} (exclusivo)")

    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
