"""
Compara códigos de caso:
- Mongo: Completados del mes (Colombia → UTC en date_info.0.created_at), excl. Alma Máter
  (misma query que list_cases_month_completed_not_alma.py).
- CSV: filas Completado, fecha ingreso (columna \"Fecha Creación\" índice 3) en ese mes/año,
  y columna \"Entidad\" sin patrón alma mater (el CSV no trae entity.id ni EPS paciente).

Imprime totales, solo en Mongo, solo en CSV, y opcionalmente listados.

Uso:
    python compare_csv_vs_mongo_march_not_alma.py --csv /ruta/Casos_2026-04-17(2).csv
    MONGO_URI=... python compare_csv_vs_mongo_march_not_alma.py --year 2026 --month 3
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from datetime import datetime
from datetime import UTC
from pathlib import Path
from zoneinfo import ZoneInfo

from pymongo import MongoClient

_BACK_END_ROOT = Path(__file__).resolve().parents[1]
if str(_BACK_END_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACK_END_ROOT))

from app.core.alma_mater_exclusion import nor_list_completed_not_alma_mater

CO = ZoneInfo("America/Bogota")

# Columnas del export (Casos_*.csv)
IX_CODE = 0
IX_STATE = 1
IX_FECHA_INGRESO = 3
IX_ENTIDAD = 9


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


def _mongo_query(db, year: int, month: int) -> dict:
    start_utc, end_utc = _month_range_utc(year, month)
    return {
        "state": "Completado",
        "date_info.0.created_at": {"$gte": start_utc, "$lt": end_utc},
        "$nor": nor_list_completed_not_alma_mater(db.entities),
    }


def _parse_csv_fecha_ingreso(raw: str) -> datetime | None:
    """Parsea fechas tipo 3/31/2026, 9:21:25 PM del export."""
    s = (raw or "").strip().strip('"')
    s = s.split("\n")[0].strip()
    if not s:
        return None
    for fmt in ("%m/%d/%Y, %I:%M:%S %p", "%m/%d/%Y %H:%M:%S", "%d/%m/%Y, %I:%M:%S %p"):
        try:
            return datetime.strptime(s[:30], fmt)
        except ValueError:
            continue
    return None


def _csv_entidad_excluye_alma(entidad: str) -> bool:
    """CSV: columna Entidad; no excluye línea Renales* aunque mencione Alma Mater."""
    s = (entidad or "").strip()
    if not s:
        return False
    if re.search(r"renales", s, re.IGNORECASE):
        return False
    if re.search(r"alma\s*m[aá]ter", s, re.IGNORECASE):
        return True
    return False


def _load_csv_codes(path: Path, year: int, month: int) -> set[str]:
    codes: set[str] = set()
    with path.open(newline="", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            return codes
        for row in reader:
            if len(row) <= IX_ENTIDAD:
                continue
            code = (row[IX_CODE] or "").strip()
            if not code:
                continue
            if (row[IX_STATE] or "").strip() != "Completado":
                continue
            dt = _parse_csv_fecha_ingreso(row[IX_FECHA_INGRESO] if len(row) > IX_FECHA_INGRESO else "")
            if dt is None or dt.year != year or dt.month != month:
                continue
            if _csv_entidad_excluye_alma(row[IX_ENTIDAD] if len(row) > IX_ENTIDAD else ""):
                continue
            codes.add(code)
    return codes


def _load_mongo_codes(db, query: dict) -> set[str]:
    codes: set[str] = set()
    for doc in db.cases.find(query, {"case_code": 1}).sort("case_code", 1):
        c = (doc.get("case_code") or "").strip()
        if c:
            codes.add(c)
    return codes


def main() -> None:
    parser = argparse.ArgumentParser()
    repo_root = Path(__file__).resolve().parents[2]
    default_csv = repo_root / "Casos_2026-04-17(2).csv"
    parser.add_argument(
        "--csv",
        type=Path,
        default=default_csv,
        help="Ruta al CSV exportado (por defecto Casos_2026-04-17(2).csv en la raíz del repo)",
    )
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--month", type=int, default=3)
    parser.add_argument(
        "--max-print",
        type=int,
        default=80,
        help="Máximo de códigos a imprimir por lista (0 = no imprimir listas)",
    )
    args = parser.parse_args()

    if args.csv is None or not args.csv.is_file():
        print("Error: indica --csv con un archivo existente.", file=sys.stderr)
        sys.exit(1)

    uri = os.environ.get("MONGO_URI", os.environ.get("MONGODB_URI", "mongodb://localhost:27017/pathsys"))
    db_name = os.environ.get("DATABASE_NAME", _db_from_uri(uri))
    client = MongoClient(uri)
    db = client[db_name]

    query = _mongo_query(db, args.year, args.month)
    mongo_codes = _load_mongo_codes(db, query)
    csv_codes = _load_csv_codes(args.csv.resolve(), args.year, args.month)

    solo_mongo = sorted(mongo_codes - csv_codes)
    solo_csv = sorted(csv_codes - mongo_codes)
    ambos = mongo_codes & csv_codes

    start_utc, end_utc = _month_range_utc(args.year, args.month)

    print(f"Base de datos: {db_name}")
    print(f"CSV: {args.csv}")
    print(f"Periodo: {args.year}-{args.month:02d} | Mongo created_at UTC: {start_utc.isoformat()} .. {end_utc.isoformat()}")
    print()
    print(f"Casos en Mongo (query sin Alma Máter):     {len(mongo_codes)}")
    print(f"Casos en CSV (Completado + mes + Entidad sin 'alma mater'): {len(csv_codes)}")
    print(f"En ambos:                                  {len(ambos)}")
    print(f"Solo en Mongo (no en CSV):                 {len(solo_mongo)}")
    print(f"Solo en CSV (no en Mongo):                 {len(solo_csv)}")
    print()
    print(
        "Nota: CSV por columna Entidad; Mongo excluye solo por entity.id (003) y entity.name "
        "(no por EPS en patient_info.entity_info)."
    )

    mx = args.max_print
    if mx > 0:
        if solo_mongo:
            print()
            print(f"--- Solo en Mongo (primeros {min(mx, len(solo_mongo))} de {len(solo_mongo)}) ---")
            for c in solo_mongo[:mx]:
                print(c)
        if solo_csv:
            print()
            print(f"--- Solo en CSV (primeros {min(mx, len(solo_csv))} de {len(solo_csv)}) ---")
            for c in solo_csv[:mx]:
                print(c)

    client.close()


if __name__ == "__main__":
    main()
