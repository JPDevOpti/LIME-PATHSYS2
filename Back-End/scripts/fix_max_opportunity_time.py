"""
fix_max_opportunity_time.py

Recalcula max_opportunity_time para TODOS los casos usando el tiempo real
de las pruebas registradas en la colección `tests`.

Si el caso ya tiene firma, también recalcula was_timely con el nuevo max.

Uso:
    python fix_max_opportunity_time.py              # actualiza cambios reales
    python fix_max_opportunity_time.py --dry-run    # solo muestra qué cambiaría
    python fix_max_opportunity_time.py --state "Completado"  # filtra por estado
    MONGO_URI=mongodb+srv://... python fix_max_opportunity_time.py
"""

import os
import sys
import argparse
from datetime import datetime, timezone

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pymongo import MongoClient

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/lime_pathsys2")
DB_NAME = MONGO_URI.split("/")[-1].split("?")[0] if "/" in MONGO_URI else "lime_pathsys2"

if "mongodb+srv" in MONGO_URI or "atlas" in MONGO_URI.lower():
    print("ERROR: Este script solo está permitido en MongoDB local. No usar con Atlas.")
    sys.exit(1)

SIGNED_STATES = {"Completado", "Por entregar"}


def get_db():
    client = MongoClient(MONGO_URI)
    return client[DB_NAME]


def load_test_times(db) -> dict[str, float]:
    """Devuelve {test_code: time} para todos los tests con time > 0."""
    result = {}
    for doc in db.tests.find({}, {"test_code": 1, "time": 1}):
        code = str(doc.get("test_code") or "").strip()
        time = doc.get("time")
        if code and time is not None:
            try:
                t = float(time)
                if t > 0:
                    result[code] = t
            except (TypeError, ValueError):
                pass
    return result


def calc_max_from_samples(samples: list, test_times: dict[str, float]) -> float | None:
    """
    Devuelve el máximo tiempo de oportunidad de los tests del caso.
    Retorna None si ningún test tiene tiempo registrado en el maestro.
    """
    max_time = None
    for sample in samples or []:
        for t in sample.get("tests", []) or []:
            code = str(t.get("test_code") or t.get("id") or "").strip()
            t_time = test_times.get(code)
            if t_time is not None:
                max_time = max(max_time, t_time) if max_time is not None else t_time
    return max_time


def parse_dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def get_signed_at(doc: dict) -> datetime | None:
    date_info = (doc.get("date_info") or [{}])[0]
    for key in ("signed_at", "delivered_at", "update_at"):
        dt = parse_dt(date_info.get(key))
        if dt:
            return dt
    for audit in reversed(doc.get("audit_info", [])):
        if audit.get("action") == "signed":
            dt = parse_dt(audit.get("timestamp"))
            if dt:
                return dt
    return None


def run(dry_run: bool, state_filter: str | None):
    db = get_db()
    test_times = load_test_times(db)
    print(f"Tests con tiempo cargados: {len(test_times)}")

    query = {"state": state_filter} if state_filter else {}
    total = db.cases.count_documents(query)
    print(f"Casos a revisar: {total}\n")

    updated = 0
    skipped = 0
    no_tests = 0
    errors = 0

    for doc in db.cases.find(query, no_cursor_timeout=True):
        case_id = doc["_id"]
        case_code = doc.get("case_code", str(case_id))
        state = doc.get("state", "")

        opp_list = doc.get("opportunity_info") or [{}]
        opp = opp_list[0] if opp_list else {}
        current_max = opp.get("max_opportunity_time")

        try:
            current_max_f = float(current_max) if current_max is not None else None
        except (TypeError, ValueError):
            current_max_f = None

        new_max = calc_max_from_samples(doc.get("samples", []), test_times)

        if new_max is None:
            print(f"  [SIN MATCH] {case_code} — ningún test encontrado en maestro (max actual: {current_max_f})")
            no_tests += 1
            continue

        if current_max_f == new_max:
            skipped += 1
            continue

        # Recalcular was_timely si el caso tiene opportunity_time registrado
        opp_time = opp.get("opportunity_time")
        was_timely = opp.get("was_timely")
        if opp_time is not None:
            try:
                was_timely = float(opp_time) <= new_max
            except (TypeError, ValueError):
                pass

        new_opp = {
            "max_opportunity_time": new_max,
            "opportunity_time": opp.get("opportunity_time"),
            "was_timely": was_timely,
        }

        label = "[DRY-RUN]" if dry_run else "[UPDATE]"
        print(f"  {label} {case_code} ({state}) | max: {current_max_f} → {new_max} | was_timely: {opp.get('was_timely')} → {was_timely}")

        if not dry_run:
            db.cases.update_one(
                {"_id": case_id},
                {"$set": {"opportunity_info": [new_opp]}}
            )
        updated += 1

    print(f"\n{'--- SIMULACIÓN ---' if dry_run else '--- RESULTADO ---'}")
    print(f"  Actualizados : {updated}")
    print(f"  Sin cambios  : {skipped}")
    print(f"  Sin match BD : {no_tests}")
    if errors:
        print(f"  Errores      : {errors}")
    if dry_run:
        print("\nModo --dry-run: ningún cambio fue escrito en la base de datos.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Recalcula max_opportunity_time desde el maestro de pruebas.")
    parser.add_argument("--dry-run", action="store_true", help="Solo muestra cambios sin escribir.")
    parser.add_argument("--state", type=str, default=None, help="Filtrar por estado (ej: 'Completado').")
    args = parser.parse_args()

    run(dry_run=args.dry_run, state_filter=args.state)
