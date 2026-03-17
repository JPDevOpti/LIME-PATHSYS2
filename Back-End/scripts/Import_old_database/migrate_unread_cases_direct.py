#!/usr/bin/env python3
"""
Migración directa de casos sin lectura: Atlas (lime_pathsys) → local (pathsys).

Transformaciones aplicadas:
  - case_code: prefijo TC{YYYY}-{NNNNN} → UR{YYYY}-{NNNNN}
  - patient_name: consolida first_name + second_name + first_last_name + second_last_name
  - test_groups: agrega campo 'observations' (null) a cada grupo
  - Elimina campos legacy: low_complexity_ihq/plates, high_complexity_ihq/plates,
    special_ihq/plates, histochemistry/plates, receipt
  - number_of_plates: si es 0 → 1 (mínimo del nuevo sistema)
  - Contadores: colección 'counters', clave 'ur_seq_{year}'

Idempotente: salta casos cuyo case_code (UR...) ya existe en local.

Uso:
    python3 migrate_unread_cases_direct.py [--dry-run]
"""

import os
import argparse
import re
from datetime import datetime, timezone
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError

# ── Configuración ─────────────────────────────────────────────────────────────

ATLAS_URL = os.environ.get("LEGACY_ATLAS_URI", "")
ATLAS_DB  = "lime_pathsys"
LOCAL_URL = os.environ.get("DEST_ATLAS_URI", "mongodb://localhost:27017")
LOCAL_DB  = "pathsys"

BATCH_SIZE = 200

# Regex para extraer año y número de códigos TC/UR (TC2024-00001, UR2024-00001)
CODE_RE = re.compile(r"^(TC|UR)(\d{4})-(\d+)$")

# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def to_utc_iso(value, *, end_of_day: bool = False) -> str | None:
    """Normaliza fechas a ISO con sufijo Z."""
    if value is None:
        return None

    dt = parse_dt(value)
    if dt is None:
        raw = str(value).strip()
        if not raw:
            return None
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
            suffix = "T23:59:59.999Z" if end_of_day else "T00:00:00.000Z"
            return f"{raw}{suffix}"
        return raw

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def clean_text(value, max_len: int | None = None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if max_len is not None:
        text = text[:max_len]
    return text


def build_patient_name(doc: dict) -> str | None:
    """Consolida los campos de nombre del sistema antiguo en un string único."""
    # Si ya tiene patient_name, usarlo
    existing = (doc.get("patient_name") or "").strip()
    if existing:
        return existing[:200]

    parts = [
        (doc.get("first_name") or "").strip(),
        (doc.get("second_name") or "").strip(),
        (doc.get("first_last_name") or "").strip(),
        (doc.get("second_last_name") or "").strip(),
    ]
    name = " ".join(p for p in parts if p)
    return name[:200] if name else None


def transform_code(old_code: str) -> str | None:
    """TC2024-00001/UR2024-00001 → UR2024-00001. Retorna None si no coincide."""
    m = CODE_RE.match((old_code or "").strip())
    if not m:
        return None
    _, year, seq = m.group(1), m.group(2), m.group(3)
    return f"UR{year}-{seq.zfill(5)}"


def normalize_test_type(value: str | None) -> str | None:
    if not value:
        return None
    raw = value.strip().upper()
    mapping = {
        "LOW_COMPLEXITY": "LOW_COMPLEXITY_IHQ",
        "LOW_COMPLEXITY_IHQ": "LOW_COMPLEXITY_IHQ",
        "HIGH_COMPLEXITY": "HIGH_COMPLEXITY_IHQ",
        "HIGH_COMPLEXITY_IHQ": "HIGH_COMPLEXITY_IHQ",
        "SPECIAL": "SPECIAL_IHQ",
        "SPECIAL_IHQ": "SPECIAL_IHQ",
        "HISTOCHEMISTRY": "HISTOCHEMISTRY",
        "HISTOQUIMICA": "HISTOCHEMISTRY",
    }
    return mapping.get(raw)


def transform_test_groups(doc: dict) -> list:
    """Normaliza test_groups y reconstruye desde campos legacy cuando aplique."""
    result = []
    groups = doc.get("test_groups")

    if isinstance(groups, list):
        for g in groups:
            if not isinstance(g, dict):
                continue
            group_type = normalize_test_type(clean_text(g.get("type")))
            tests = []
            for t in g.get("tests") or []:
                if not isinstance(t, dict):
                    continue
                code = clean_text(t.get("code"), 50)
                if not code:
                    continue
                qty_raw = t.get("quantity")
                try:
                    quantity = max(int(qty_raw or 1), 1)
                except (TypeError, ValueError):
                    quantity = 1
                tests.append(
                    {
                        "code": code,
                        "quantity": quantity,
                        "name": clean_text(t.get("name"), 200),
                    }
                )
            if group_type and tests:
                result.append(
                    {
                        "type": group_type,
                        "tests": tests,
                        "observations": clean_text(g.get("observations"), 500),
                    }
                )

    if result:
        return result

    legacy_groups = [
        ("LOW_COMPLEXITY_IHQ", doc.get("low_complexity_ihq"), doc.get("low_complexity_plates")),
        ("HIGH_COMPLEXITY_IHQ", doc.get("high_complexity_ihq"), doc.get("high_complexity_plates")),
        ("SPECIAL_IHQ", doc.get("special_ihq"), doc.get("special_plates")),
        ("HISTOCHEMISTRY", doc.get("histochemistry"), doc.get("histochemistry_plates")),
    ]
    for group_type, code_raw, qty_raw in legacy_groups:
        code = clean_text(code_raw, 50)
        if not code:
            continue
        try:
            quantity = max(int(qty_raw or 1), 1)
        except (TypeError, ValueError):
            quantity = 1
        result.append(
            {
                "type": group_type,
                "tests": [{"code": code, "quantity": quantity, "name": None}],
                "observations": None,
            }
        )

    return result


def transform(old: dict, now_iso: str) -> dict:
    new_code = transform_code(old.get("case_code", ""))

    # Patient name consolidado
    patient_name = build_patient_name(old)

    # Patient document: máx 20 chars en nuevo sistema
    patient_document = clean_text(old.get("patient_document"), 20)

    # Entity
    entity_code = clean_text(old.get("entity_code"), 50)
    entity_name = clean_text(old.get("entity_name"), 200)
    institution = clean_text(old.get("institution"), 200)

    # Notes: máx 500 chars
    notes = clean_text(old.get("notes"), 500)

    # Test groups con 'observations' agregado
    test_groups = transform_test_groups(old)

    # number_of_plates: mínimo 1
    plates = int(old.get("number_of_plates") or 0)
    plates = max(plates, 1)

    # Campos simples
    delivered_to = clean_text(old.get("delivered_to"), 200)
    delivery_date = to_utc_iso(old.get("delivery_date"), end_of_day=True)
    entry_date = to_utc_iso(old.get("entry_date"))
    received_by = clean_text(old.get("received_by"), 200)
    status = clean_text(old.get("status"), 50) or "En proceso"

    created_at = to_utc_iso(old.get("created_at")) or now_iso
    updated_at = to_utc_iso(old.get("updated_at")) or now_iso

    return {
        "case_code":         new_code,
        "is_special_case":   bool(old.get("is_special_case", False)),
        "document_type":     clean_text(old.get("document_type"), 10),
        "patient_document":  patient_document,
        "patient_name":      patient_name,
        "entity_code":       entity_code,
        "entity_name":       entity_name,
        "institution":       institution,
        "notes":             notes,
        "test_groups":       test_groups,
        "number_of_plates":  plates,
        "delivered_to":      delivered_to,
        "delivery_date":     delivery_date,
        "entry_date":        entry_date,
        "received_by":       received_by,
        "status":            status,
        "updated_by":        None,
        "created_at":        created_at,
        "updated_at":        updated_at,
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def run(dry_run: bool, dest_url: str = LOCAL_URL, dest_db: str = LOCAL_DB):
    print("=" * 66)
    print("  MIGRACIÓN: casos sin lectura lime_pathsys → pathsys (local)")
    print("=" * 66)
    print(f"  Modo : {'DRY-RUN (sin cambios)' if dry_run else 'REAL'}\n")

    # ── Conexiones ────────────────────────────────────────────────────────────
    print("Conectando a Atlas...")
    atlas = MongoClient(ATLAS_URL, serverSelectionTimeoutMS=15000)
    atlas.admin.command("ping")
    print("  Atlas OK")

    print("Conectando a MongoDB destino...")
    local = MongoClient(dest_url, serverSelectionTimeoutMS=5000)
    local.admin.command("ping")
    print(f"  Destino OK (db={dest_db})\n")

    src = atlas[ATLAS_DB]["unread_cases"]
    dst = local[dest_db]["unread_cases"]
    cnt = local[dest_db]["counters"]

    # ── Índices en destino ────────────────────────────────────────────────────
    if not dry_run:
        dst.create_index("case_code", unique=True)
        dst.create_index("entry_date")
        dst.create_index("status")
        dst.create_index("entity_code")

    # ── Cargar códigos existentes en local ────────────────────────────────────
    existing_codes: set[str] = {d["case_code"] for d in dst.find({}, {"case_code": 1})}
    print(f"Casos sin lectura en local : {len(existing_codes)}")
    print(f"Casos sin lectura en Atlas : {src.count_documents({})}")
    print(f"{'─'*66}")

    stats = {
        "inserted":       0,
        "skipped_dup":    0,
        "skipped_invalid": 0,
        "errors":         0,
    }
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    batch = []

    # Seguimiento de seq máximo por año para sincronizar contadores
    max_seq_by_year: dict[str, int] = {}

    def flush(batch: list):
        if not batch:
            return 0, 0
        try:
            result = dst.insert_many(batch, ordered=False)
            return len(result.inserted_ids), 0
        except BulkWriteError as e:
            # insert_many con ordered=False puede insertar parcialmente
            print(f"  [BATCH-ERROR] {e}")
            details = e.details or {}
            inserted = int(details.get("nInserted", 0))
            errors = len(details.get("writeErrors", []) or [])
            return inserted, errors
        except Exception as e:
            print(f"  [BATCH-ERROR] {e}")
            return 0, len(batch)

    for old in src.find({}):
        old_code = (old.get("case_code") or "").strip()
        new_code = transform_code(old_code)

        if not new_code:
            print(f"  [INVÁLIDO] case_code sin formato reconocido: {old_code!r}")
            stats["skipped_invalid"] += 1
            continue

        if new_code in existing_codes:
            stats["skipped_dup"] += 1
            continue

        doc = transform(old, now_iso)

        if dry_run:
            print(f"  [DRY-RUN] {old_code} → {new_code}  status={doc['status']!r}")
            stats["inserted"] += 1
            existing_codes.add(new_code)
            # Registrar seq para dry-run info
            m = CODE_RE.match(old_code)
            if m:
                yr, seq = m.group(2), int(m.group(3))
                if yr not in max_seq_by_year or seq > max_seq_by_year[yr]:
                    max_seq_by_year[yr] = seq
            continue

        # Registrar seq máximo por año
        m = CODE_RE.match(old_code)
        if m:
            yr, seq = m.group(2), int(m.group(3))
            if yr not in max_seq_by_year or seq > max_seq_by_year[yr]:
                max_seq_by_year[yr] = seq

        batch.append(doc)
        existing_codes.add(new_code)

        if len(batch) >= BATCH_SIZE:
            inserted, errors = flush(batch)
            stats["inserted"] += inserted
            stats["errors"] += errors
            print(f"  ... {stats['inserted']} casos insertados hasta ahora")
            batch.clear()

    if batch:
        inserted, errors = flush(batch)
        stats["inserted"] += inserted
        stats["errors"] += errors
        batch.clear()

    # ── Sincronizar contadores ────────────────────────────────────────────────
    if not dry_run and max_seq_by_year:
        print(f"\nSincronizando contadores (ur_seq_{{year}})...")
        ops = []
        for year, max_seq in sorted(max_seq_by_year.items()):
            key = f"ur_seq_{year}"
            # Solo actualizar si el seq local es menor al importado
            current = cnt.find_one({"_id": key}) or {}
            current_seq = current.get("seq", 0)
            if max_seq > current_seq:
                ops.append(UpdateOne(
                    {"_id": key},
                    {"$max": {"seq": max_seq}},
                    upsert=True,
                ))
                print(f"  {key}: {current_seq} → {max_seq}")
            else:
                print(f"  {key}: ya en {current_seq} (atlas max={max_seq}), sin cambio")
        if ops:
            cnt.bulk_write(ops)
    elif dry_run and max_seq_by_year:
        print(f"\nContadores que se sincronizarían (dry-run):")
        for year, max_seq in sorted(max_seq_by_year.items()):
            print(f"  ur_seq_{year} → {max_seq}")

    atlas.close()
    local.close()

    print(f"\n{'─'*66}")
    print("RESULTADO")
    print(f"{'─'*66}")
    print(f"  Insertados            : {stats['inserted']}")
    print(f"  Saltados (ya existen) : {stats['skipped_dup']}")
    print(f"  Saltados (inválidos)  : {stats['skipped_invalid']}")
    print(f"  Errores               : {stats['errors']}")
    if dry_run:
        print("\n  DRY-RUN: ningún cambio realizado.")
    print("=" * 66)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Migra casos sin lectura de Atlas a local (TC→UR)"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Simula la migración sin escribir nada")
    parser.add_argument("--dest-url", default=LOCAL_URL, help="MongoDB URI destino")
    parser.add_argument("--dest-db", default=LOCAL_DB, help="Base de datos destino")
    args = parser.parse_args()
    run(dry_run=args.dry_run, dest_url=args.dest_url, dest_db=args.dest_db)
