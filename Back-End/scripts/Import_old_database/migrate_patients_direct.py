#!/usr/bin/env python3
"""
Migración directa de pacientes: Atlas (lime_pathsys) → local (pathsys).

- Lee desde MongoDB Atlas sin archivo intermedio.
- Inserta en lotes (bulk) para máximo rendimiento.
- Salta pacientes ya existentes por (identification_type, identification_number).
- Idempotente: se puede ejecutar varias veces sin duplicar datos.

Uso:
    python3 migrate_patients_direct.py [--dry-run] [--batch-size N]
"""

import os
import sys
import argparse
import re
from datetime import datetime
from pymongo import MongoClient, InsertOne
from pymongo.errors import BulkWriteError

# ── Configuración ─────────────────────────────────────────────────────────────

ATLAS_URL  = os.environ.get("LEGACY_ATLAS_URI", "")
ATLAS_DB   = "lime_pathsys"

LOCAL_URL  = "mongodb://localhost:27017"
LOCAL_DB   = "pathsys"

DEFAULT_BATCH_SIZE = 200

# ── Mapeo identification_type ─────────────────────────────────────────────────

ID_TYPE_MAP = {
    0: "NN", 1: "CC",  2: "CE",  3: "TI", 4: "PA",
    5: "RC", 6: "DE",  7: "NIT", 8: "CD", 9: "SC",
    10: "NN", 11: "NN", 12: "PA",
}
VALID_ID_TYPES = {"CC", "TI", "RC", "PA", "CE", "DE", "SC", "NIT", "CD", "NN"}
ID_NUMBER_RE   = re.compile(r"^[a-zA-Z0-9]{4,20}$")

# ── Helpers ───────────────────────────────────────────────────────────────────

def map_id_type(raw) -> str | None:
    if isinstance(raw, int):
        return ID_TYPE_MAP.get(raw)
    if isinstance(raw, str):
        u = raw.upper()
        return u if u in VALID_ID_TYPES else None
    return None


def parse_datetime(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def parse_birth_date(value) -> str | None:
    if not value:
        return None
    dt = parse_datetime(value)
    return dt.strftime("%Y-%m-%d") if dt else (str(value)[:10] if value else None)


def build_full_name(doc: dict) -> str:
    parts = [
        doc.get("first_name") or "",
        doc.get("second_name") or "",
        doc.get("first_lastname") or "",
        doc.get("second_lastname") or "",
    ]
    return " ".join(p for p in parts if p).strip()


def transform(raw: dict, seq: int, now: datetime) -> dict:
    """Convierte un documento del formato antiguo al nuevo."""
    raw_loc = raw.get("location") or {}
    raw_ent = raw.get("entity_info") or {}
    created_at = parse_datetime(raw.get("created_at")) or now
    updated_at = parse_datetime(raw.get("updated_at")) or now

    return {
        "patient_code":          f"P-{seq:05d}",
        "identification_type":   map_id_type(raw.get("identification_type")),
        "identification_number": str(raw.get("identification_number") or "").strip(),
        "first_name":            (raw.get("first_name") or "").strip(),
        "second_name":           (raw.get("second_name") or "").strip() or None,
        "first_lastname":        (raw.get("first_lastname") or "").strip(),
        "second_lastname":       (raw.get("second_lastname") or "").strip() or None,
        "full_name":             build_full_name(raw),
        "birth_date":            parse_birth_date(raw.get("birth_date")),
        "gender":                raw.get("gender") or "Masculino",
        "phone":                 None,
        "email":                 None,
        "care_type":             raw.get("care_type") or "Ambulatorio",
        "entity_info": {
            "entity_name": raw_ent.get("name") or None,
            "eps_name":    None,
        },
        "location": {
            "country":      None,
            "department":   None,
            "municipality": raw_loc.get("municipality_name") or None,
            "subregion":    raw_loc.get("subregion") or None,
            "address":      raw_loc.get("address") or None,
        },
        "observations": raw.get("observations") or None,
        "created_at":   created_at,
        "updated_at":   updated_at,
        "audit_info": [{
            "action":     "created",
            "user_email": "migration@system",
            "timestamp":  created_at,
        }],
    }


def get_next_seq(counters_coll) -> int:
    result = counters_coll.find_one_and_update(
        {"_id": "patient_seq"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return result.get("seq", 1)


# ── Main ──────────────────────────────────────────────────────────────────────

def run(
    dry_run: bool,
    batch_size: int,
    dest_url: str = LOCAL_URL,
    dest_db: str = LOCAL_DB,
):
    print("=" * 62)
    print("  MIGRACIÓN DIRECTA: lime_pathsys (Atlas) → pathsys (local)")
    print("=" * 62)
    print(f"  Modo       : {'DRY-RUN (sin cambios)' if dry_run else 'REAL'}")
    print(f"  Batch size : {batch_size}")
    print()

    # ── Conexiones ────────────────────────────────────────────────────────────
    print("Conectando a Atlas...")
    atlas  = MongoClient(ATLAS_URL, serverSelectionTimeoutMS=15000)
    atlas.admin.command("ping")
    print("  Atlas OK")

    print("Conectando a MongoDB destino...")
    local  = MongoClient(dest_url, serverSelectionTimeoutMS=5000)
    local.admin.command("ping")
    print(f"  Destino OK (db={dest_db})\n")

    src_coll      = atlas[ATLAS_DB]["patients"]
    dst_coll      = local[dest_db]["patients"]
    counters_coll = local[dest_db]["counters"]

    # ── Índices en destino ────────────────────────────────────────────────────
    if not dry_run:
        dst_coll.create_index("patient_code", unique=True)
        dst_coll.create_index(
            [("identification_type", 1), ("identification_number", 1)], unique=True
        )
        dst_coll.create_index("created_at")

    # ── Cargar claves existentes en memoria (O(1) lookup) ─────────────────────
    print("Cargando pacientes existentes en local...")
    existing_keys: set[tuple] = set()
    for doc in dst_coll.find({}, {"identification_type": 1, "identification_number": 1}):
        it = doc.get("identification_type")
        if isinstance(it, int):
            it = ID_TYPE_MAP.get(it, str(it))
        existing_keys.add((it, str(doc.get("identification_number") or "")))
    print(f"  Ya existentes: {len(existing_keys):,}\n")

    # ── Leer total de origen ──────────────────────────────────────────────────
    total_src = src_coll.count_documents({})
    print(f"Pacientes en Atlas: {total_src:,}")
    print(f"{'─'*62}")

    # ── Estadísticas ──────────────────────────────────────────────────────────
    stats = {"inserted": 0, "skipped_dup": 0, "skipped_invalid": 0, "errors": 0}
    now   = datetime.utcnow()

    # ── Procesar en lotes ─────────────────────────────────────────────────────
    batch: list[InsertOne] = []
    processed = 0

    for raw in src_coll.find({}).batch_size(batch_size):
        processed += 1

        # Validar tipo de ID
        id_type = map_id_type(raw.get("identification_type"))
        id_num  = str(raw.get("identification_number") or "").strip()

        if id_type is None or not ID_NUMBER_RE.match(id_num):
            stats["skipped_invalid"] += 1
            continue

        # Saltar si ya existe
        if (id_type, id_num) in existing_keys:
            stats["skipped_dup"] += 1
            continue

        # Construir documento transformado
        if not dry_run:
            seq = get_next_seq(counters_coll)
            doc = transform(raw, seq, now)
            batch.append(InsertOne(doc))
            # Agregar a existing_keys para evitar duplicados dentro del mismo lote
            existing_keys.add((id_type, id_num))
        else:
            stats["inserted"] += 1

        # Flush de lote
        if not dry_run and len(batch) >= batch_size:
            try:
                result = dst_coll.bulk_write(batch, ordered=False)
                stats["inserted"] += result.inserted_count
            except BulkWriteError as bwe:
                stats["inserted"]  += bwe.details.get("nInserted", 0)
                stats["errors"]    += len(bwe.details.get("writeErrors", []))
            batch = []

        # Progreso
        if processed % 200 == 0 or processed == total_src:
            pct = processed * 100 // total_src
            print(
                f"  [{pct:3d}%] procesados={processed:,}  "
                f"insertados={stats['inserted']:,}  "
                f"saltados={stats['skipped_dup']:,}"
            )

    # Flush final
    if not dry_run and batch:
        try:
            result = dst_coll.bulk_write(batch, ordered=False)
            stats["inserted"] += result.inserted_count
        except BulkWriteError as bwe:
            stats["inserted"] += bwe.details.get("nInserted", 0)
            stats["errors"]   += len(bwe.details.get("writeErrors", []))

    atlas.close()
    local.close()

    # ── Resumen ───────────────────────────────────────────────────────────────
    print(f"{'─'*62}")
    print("RESULTADO")
    print(f"{'─'*62}")
    print(f"  Insertados            : {stats['inserted']:,}")
    print(f"  Saltados (ya existen) : {stats['skipped_dup']:,}")
    print(f"  Saltados (inválidos)  : {stats['skipped_invalid']:,}")
    print(f"  Errores               : {stats['errors']:,}")
    print(f"  Total procesados      : {processed:,}")
    if dry_run:
        print("\n  DRY-RUN: ningún cambio realizado.")
    print("=" * 62)


# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Migra pacientes directamente de Atlas a MongoDB local"
    )
    parser.add_argument("--dry-run",    action="store_true", help="Simular sin escribir")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE,
                        help=f"Documentos por lote (default: {DEFAULT_BATCH_SIZE})")
    parser.add_argument("--dest-url", default=LOCAL_URL, help="MongoDB URI destino")
    parser.add_argument("--dest-db", default=LOCAL_DB, help="Base de datos destino")
    args = parser.parse_args()
    run(
        dry_run=args.dry_run,
        batch_size=args.batch_size,
        dest_url=args.dest_url,
        dest_db=args.dest_db,
    )
