"""
fix_max_opportunity_time.py

Recalcula max_opportunity_time para TODOS los casos usando el tiempo real
de las pruebas registradas en la colección `tests`.

Si el caso ya tiene firma, también recalcula was_timely con el nuevo max.

Uso:
    python fix_max_opportunity_time.py              # actualiza cambios reales
    python fix_max_opportunity_time.py --dry-run    # solo muestra qué cambiaría
    python fix_max_opportunity_time.py --state "Completado"  # filtra por estado

Local:
    MONGO_URI=mongodb://localhost:27017/pathsys python scripts/fix_max_opportunity_time.py

Atlas (la URI suele terminar en / sin nombre de BD; usa --database o MONGODB_DB):
    MONGODB_URI='mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net/' \\
        MONGODB_DB=pathsys python scripts/fix_max_opportunity_time.py --dry-run

    # o con nombre de BD en la URI:
    MONGODB_URI='mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net/pathsys' \\
        python scripts/fix_max_opportunity_time.py
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pymongo import MongoClient


def resolve_mongo_uri(cli_uri: str | None) -> str:
    return (
        (cli_uri or "").strip()
        or os.environ.get("MONGO_URI", "").strip()
        or os.environ.get("MONGODB_URI", "").strip()
        or "mongodb://localhost:27017/pathsys"
    )


def resolve_database_name(uri: str, cli_database: str | None) -> str:
    if cli_database and cli_database.strip():
        return cli_database.strip()
    env_db = (os.environ.get("MONGODB_DB") or os.environ.get("DATABASE_NAME") or "").strip()
    if env_db:
        return env_db
    without_query = uri.split("?", 1)[0].rstrip("/")
    if "@" in without_query:
        after_host = without_query.split("@", 1)[1]
        if "/" in after_host:
            segment = after_host.split("/", 1)[1].strip("/")
            if segment:
                return segment.split("/")[0]
    return "pathsys"


def get_db(uri: str, db_name: str):
    kwargs: dict = {}
    if "mongodb+srv" in uri or "mongodb://" in uri:
        kwargs["serverSelectionTimeoutMS"] = int(
            os.environ.get("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "30000")
        )
    client = MongoClient(uri, **kwargs)
    return client[db_name]


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


def run(dry_run: bool, state_filter: str | None, uri: str, db_name: str):
    db = get_db(uri, db_name)
    test_times = load_test_times(db)
    print(f"Base de datos: {db_name}")
    print(f"Tests con tiempo cargados: {len(test_times)}")

    query = {"state": state_filter} if state_filter else {}
    total = db.cases.count_documents(query)
    print(f"Casos a revisar: {total}\n")

    updated = 0
    skipped = 0
    no_tests = 0
    errors = 0

    # Sin no_cursor_timeout: Atlas M0/M2 no lo permite en algunos tiers.
    for doc in db.cases.find(query):
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
    parser.add_argument(
        "--uri",
        type=str,
        default=None,
        help="URI MongoDB (por defecto MONGO_URI o MONGODB_URI).",
    )
    parser.add_argument(
        "--database",
        "-d",
        type=str,
        default=None,
        help="Nombre de la base (por defecto pathsys o MONGODB_DB / DATABASE_NAME; obligatorio si la URI termina en /).",
    )
    args = parser.parse_args()

    mongo_uri = resolve_mongo_uri(args.uri)
    database_name = resolve_database_name(mongo_uri, args.database)

    run(
        dry_run=args.dry_run,
        state_filter=args.state,
        uri=mongo_uri,
        db_name=database_name,
    )
