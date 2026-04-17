"""
Compara **casos distintos** que incluyen una prueba (test_code) entre Mongo y el export.

El export cuenta **una fila = un caso** si en alguna columna M* Prueba * aparece el código.
Mongo debe contar **casos únicos** (`_id`), no líneas sueltas ($unwind puede duplicar el mismo
caso si la prueba está en varias muestras).

Opcionalmente muestra también líneas/ celdas totales (puede ser > casos si hay varias muestras).

Uso:
    python compare_test_code_xlsx_vs_mongo.py --csv /ruta/Casos.csv --test-code 898101 --year 2026 --month 3
    python compare_test_code_xlsx_vs_mongo.py --xlsx /ruta/Casos.xlsx --test-code 898101 --year 2026 --month 3

Variables: MONGO_URI, DATABASE_NAME (opcional).
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import sys
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from xml.etree import ElementTree as ET
from zoneinfo import ZoneInfo

from pymongo import MongoClient

_BACK_END_ROOT = Path(__file__).resolve().parents[1]
if str(_BACK_END_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACK_END_ROOT))

from app.core.alma_mater_exclusion import nor_list_completed_not_alma_mater

CO = ZoneInfo("America/Bogota")

_NS_MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def _col_letters_to_index(letters: str) -> int:
    n = 0
    for ch in letters.upper():
        n = n * 26 + (ord(ch) - ord("A") + 1)
    return n - 1


def _parse_cell_ref(ref: str) -> tuple[int, int]:
    m = re.match(r"^([A-Z]+)(\d+)$", ref.upper().strip(), re.I)
    if not m:
        return 0, 0
    return _col_letters_to_index(m.group(1)), int(m.group(2)) - 1


def _read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        data = zf.read("xl/sharedStrings.xml")
    except KeyError:
        return []
    root = ET.fromstring(data)
    out: list[str] = []
    for si in root.findall(f".//{_NS_MAIN}si"):
        parts: list[str] = []
        for t in si.iter(f"{_NS_MAIN}t"):
            if t.text:
                parts.append(t.text)
            if t.tail:
                parts.append(t.tail)
        out.append("".join(parts).strip())
    return out


def _cell_value(c: ET.Element, shared: list[str]) -> str | None:
    t = c.get("t")
    v_el = c.find(f"{_NS_MAIN}v")
    if v_el is None or v_el.text is None:
        return None
    raw = v_el.text.strip()
    if t == "s":
        try:
            return shared[int(raw)] if 0 <= int(raw) < len(shared) else raw
        except ValueError:
            return raw
    return raw


def read_xlsx_first_sheet_as_rows(path: Path) -> list[list[str | None]]:
    """Primera hoja: matriz dispersa -> filas con None en huecos."""
    with zipfile.ZipFile(path, "r") as zf:
        shared = _read_shared_strings(zf)
        try:
            sheet_xml = zf.read("xl/worksheets/sheet1.xml")
        except KeyError:
            names = [n for n in zf.namelist() if n.startswith("xl/worksheets/sheet") and n.endswith(".xml")]
            if not names:
                raise ValueError("No hay hojas en el xlsx")
            sheet_xml = zf.read(sorted(names)[0])
    root = ET.fromstring(sheet_xml)
    sheet_data = root.find(f"{_NS_MAIN}sheetData")
    if sheet_data is None:
        return []
    max_col = 0
    max_row = 0
    cells: dict[tuple[int, int], str] = {}
    for row in sheet_data.findall(f"{_NS_MAIN}row"):
        for c in row.findall(f"{_NS_MAIN}c"):
            ref = c.get("r")
            if not ref:
                continue
            col_i, row_i = _parse_cell_ref(ref)
            val = _cell_value(c, shared)
            if val is not None:
                cells[(row_i, col_i)] = val
            max_col = max(max_col, col_i)
            max_row = max(max_row, row_i)
    rows: list[list[str | None]] = []
    for r in range(max_row + 1):
        row_vals: list[str | None] = []
        for c in range(max_col + 1):
            row_vals.append(cells.get((r, c)))
        rows.append(row_vals)
    return rows


def read_csv_as_rows(path: Path) -> list[list[str | None]]:
    """Primera hoja lógica: una fila por registro CSV (utf-8-sig)."""
    rows: list[list[str | None]] = []
    with path.open(newline="", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.reader(f)
        for raw in reader:
            rows.append([c if c != "" else None for c in raw])
    return rows


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


def _mongo_match_completed_month(db, year: int, month: int) -> dict:
    start_utc, end_utc = _month_range_utc(year, month)
    q: dict = {
        "state": "Completado",
        "date_info.0.created_at": {"$gte": start_utc, "$lt": end_utc},
        "$nor": nor_list_completed_not_alma_mater(db.entities),
    }
    return q


def _test_code_match(test_code: str) -> dict:
    code = str(test_code).strip()
    if code.isdigit():
        return {
            "$or": [
                {"samples.tests.test_code": code},
                {"samples.tests.test_code": int(code)},
            ]
        }
    return {"samples.tests.test_code": code}


def mongo_count_distinct_cases_with_test(db, match: dict, test_code: str) -> int:
    """Casos únicos con al menos una línea samples.tests con ese test_code."""
    code_match = _test_code_match(test_code)
    pipeline = [
        {"$match": match},
        {"$unwind": "$samples"},
        {"$unwind": "$samples.tests"},
        {"$match": code_match},
        {"$group": {"_id": "$_id"}},
        {"$count": "n"},
    ]
    agg = list(db.cases.aggregate(pipeline))
    return int(agg[0]["n"]) if agg else 0


def mongo_count_test_lines(db, match: dict, test_code: str) -> int:
    """Líneas tras $unwind (volumen de solicitudes en informe estadístico)."""
    code_match = _test_code_match(test_code)
    pipeline = [
        {"$match": match},
        {"$unwind": "$samples"},
        {"$unwind": "$samples.tests"},
        {"$match": code_match},
        {"$count": "n"},
    ]
    agg = list(db.cases.aggregate(pipeline))
    return int(agg[0]["n"]) if agg else 0


def _parse_export_fecha(raw: str | None) -> datetime | None:
    if not raw:
        return None
    s = str(raw).strip().strip('"').split("\n")[0].strip()
    if not s:
        return None
    for fmt in ("%m/%d/%Y, %I:%M:%S %p", "%m/%d/%Y %H:%M:%S", "%d/%m/%Y, %I:%M:%S %p"):
        try:
            return datetime.strptime(s[:32], fmt)
        except ValueError:
            continue
    return None


def export_count_test_cells(
    rows: list[list[str | None]],
    test_code: str,
    year: int,
    month: int,
) -> tuple[int, int, list[str]]:
    """
    - celdas_con_codigo: suma de celdas M* Prueba * iguales al código (puede ser > 1 por fila).
    - casos_distintos: filas (casos) con al menos una celda con ese código.
    """
    if not rows:
        return 0, 0, []
    header = [((h or "").strip() if h else "") for h in rows[0]]
    prueba_col_indexes = [
        i
        for i, h in enumerate(header)
        if re.match(r"^M\d+\s+Prueba\s+\d+$", h, re.I)
    ]
    try:
        ix_code = header.index("Código Caso")
    except ValueError:
        ix_code = 0
    try:
        ix_state = header.index("Estado")
    except ValueError:
        ix_state = 1
    try:
        ix_fecha = header.index("Fecha Creación")
    except ValueError:
        ix_fecha = 3

    code_norm = str(test_code).strip()
    count = 0
    case_hits: set[str] = set()
    sample_cases: list[str] = []

    for r in rows[1:]:
        if len(r) <= max(prueba_col_indexes or [0], default=0):
            continue
        state = (r[ix_state] or "").strip() if ix_state < len(r) else ""
        if state != "Completado":
            continue
        raw_f = r[ix_fecha] if ix_fecha < len(r) else None
        dt = _parse_export_fecha(raw_f)
        if dt is None or dt.year != year or dt.month != month:
            continue
        case_code = (r[ix_code] or "").strip() if ix_code < len(r) else ""
        row_hits = 0
        for ci in prueba_col_indexes:
            if ci >= len(r):
                continue
            cell = (r[ci] or "").strip()
            if cell == code_norm:
                count += 1
                row_hits += 1
        if row_hits and case_code:
            case_hits.add(case_code)
            if len(sample_cases) < 5:
                sample_cases.append(case_code)

    return count, len(case_hits), sample_cases


def main() -> None:
    parser = argparse.ArgumentParser(description="Comparar conteo de prueba: Mongo vs export CSV/XLSX")
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--csv", type=Path, help="Ruta a Casos_*.csv")
    src.add_argument("--xlsx", type=Path, help="Ruta a Casos_*.xlsx")
    parser.add_argument("--test-code", default="898101", help="Código de prueba (ej. 898101)")
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--month", type=int, default=3, help="Mes civil 1-12")
    parser.add_argument("--max-print-diff", type=int, default=0, help="Si >0, intenta listar (solo diagnóstico)")
    args = parser.parse_args()

    path = (args.csv or args.xlsx).resolve()
    if not path.is_file():
        print(f"Error: no existe el archivo {path}", file=sys.stderr)
        sys.exit(1)

    if args.csv:
        rows = read_csv_as_rows(path)
        export_label = "CSV"
    else:
        rows = read_xlsx_first_sheet_as_rows(path)
        export_label = "Excel"

    celdas_export, casos_export, _samples = export_count_test_cells(rows, args.test_code, args.year, args.month)

    uri = os.environ.get("MONGO_URI", os.environ.get("MONGODB_URI", "mongodb://localhost:27017/pathsys"))
    db_name = os.environ.get("DATABASE_NAME", _db_from_uri(uri))
    client = MongoClient(uri)
    db = client[db_name]

    match = _mongo_match_completed_month(db, args.year, args.month)
    mongo_casos = mongo_count_distinct_cases_with_test(db, match, args.test_code)
    mongo_lineas = mongo_count_test_lines(db, match, args.test_code)

    start_utc, end_utc = _month_range_utc(args.year, args.month)

    print(f"Base de datos: {db_name}")
    print(f"Archivo: {path}")
    print(f"Prueba (test_code): {args.test_code}")
    print(f"Periodo ingreso (date_info.0.created_at): {args.year}-{args.month:02d}")
    print(f"  UTC: {start_utc.isoformat()} .. {end_utc.isoformat()}")
    print()
    print("Comparación principal — casos distintos con al menos una vez esta prueba:")
    print(f"  Mongo:  {mongo_casos}")
    print(f"  {export_label}: {casos_export}")
    print()
    diff = mongo_casos - casos_export
    print(f"Diferencia (Mongo - {export_label}, casos): {diff}")
    print()
    print("Detalle (misma cohorte; una fila puede tener la prueba en varias muestras/celdas):")
    print(f"  Líneas Mongo ($unwind por muestra/prueba): {mongo_lineas}")
    print(f"  Celdas en export (columnas M* Prueba *):     {celdas_export}")
    if diff != 0:
        print(
            "\nNota si casos difieren: fechas de ingreso, filtros de export, o códigos con espacios."
        )

    client.close()


if __name__ == "__main__":
    main()
