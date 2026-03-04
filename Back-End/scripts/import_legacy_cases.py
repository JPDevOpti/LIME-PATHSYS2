"""
Script de importación de casos legacy desde CSV.

Uso:
    python scripts/import_legacy_cases.py \
        --casos "analisis(pacientes viejos)/casos_(citas).csv" \
        --muestras "analisis(pacientes viejos)/muestras_de_laboratorio.csv"

Colección destino: cases_legacy
"""
import argparse
import csv
import sys
from datetime import datetime, timezone
from pathlib import Path

# ── Ajusta el path para importar la config de la app ──────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))

from pymongo import MongoClient, ASCENDING

# DB por defecto (se sobreescribe si hay config de la app)
MONGO_URI = "mongodb://localhost:27017"
MONGO_DB = "pathsys"

try:
    from app.config import settings
    MONGO_URI = settings.MONGODB_URI
    MONGO_DB = settings.MONGODB_DB
except Exception:
    pass


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_date(value: str) -> datetime | None:
    """Convierte 'YYYY-MM-DD' o 'YYYY-MM-DD HH:MM:SS' a datetime UTC."""
    if not value or not value.strip():
        return None
    value = value.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(value, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _split_patient(raw: str) -> tuple[str, str]:
    """
    '22086199 - PAULINA LOAIZA YATE'  →  ('22086199', 'PAULINA LOAIZA YATE')
    Si no tiene ' - ' devuelve ('', raw).
    """
    if " - " in raw:
        parts = raw.split(" - ", 1)
        return parts[0].strip(), parts[1].strip()
    return "", raw.strip()


def _split_origin(raw: str) -> tuple[str, str]:
    """
    'HUSVF (Hospitalizado)' → ('HUSVF', 'Hospitalizado')
    'Particular'            → ('Particular', '')
    """
    raw = raw.strip()
    if "(" in raw and raw.endswith(")"):
        entity, rest = raw.rsplit("(", 1)
        return entity.strip(), rest.rstrip(")").strip()
    return raw, ""


def _norm_number(raw: str) -> str:
    """Normaliza 57743 → 'D/57743', ya formateados pasan tal cual."""
    raw = raw.strip()
    if raw and not raw.startswith("D/"):
        return f"D/{raw}"
    return raw


# ── Carga de muestras ─────────────────────────────────────────────────────────

def load_samples(path: str) -> dict[str, list[dict]]:
    """Devuelve {appointment_id: [sample, ...]} agrupado por cita."""
    groups: dict[str, list[dict]] = {}
    with open(path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            appt = _norm_number(row.get("Appointment", "").strip())
            if not appt:
                continue
            sample = {
                "number": _safe_int(row.get("Sample number", "")),
                "anatomical_location": row.get("Anatomical location", "").strip() or None,
                "macroscopic": row.get("Raw macroscopic description", "").strip() or None,
                "microscopic": row.get("Raw microscopic description", "").strip() or None,
                "test_type": row.get("Test type", "").strip() or None,
                "lab_service": row.get("Lab Service", "").strip() or None,
                "note": row.get("Note", "").strip() or None,
                "histoquimica": row.get("Estudio histoquímica", "").strip() or None,
                "inmunohistoquimica": row.get("Estudio inmunohistoquímica", "").strip() or None,
                "transcription_date": _parse_date(row.get("Transcription date", "")),
            }
            groups.setdefault(appt, []).append(sample)

    # Ordenar muestras por número dentro de cada cita
    for appt in groups:
        groups[appt].sort(key=lambda s: s["number"] or 0)
    return groups


def _safe_int(value: str) -> int | None:
    try:
        return int(value.strip())
    except (ValueError, AttributeError):
        return None


def build_document(row: dict, samples_map: dict[str, list[dict]]) -> dict | None:
    """Construye el documento de caso legacy a insertar. Devuelve None si debe omitirse."""
    raw_number = row.get("Number", "").strip()
    legacy_id = _norm_number(raw_number)

    ident, full_name = _split_patient(row.get("Patient", ""))
    entity_name, care_type = _split_origin(row.get("Origin", ""))

    # Buscar paciente en la base de datos
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]
    patient_db = db["patients"].find_one({"identification_number": ident}) if ident else None
    client.close()

    if not patient_db:
        return None

    # Guardar referencia al paciente existente y una copia (snapshot) de sus datos
    patient_ref = patient_db.get("_id")
    patient_snapshot = {
        "_id": patient_db.get("_id"),
        "patient_code": patient_db.get("patient_code"),
        "identification_type": patient_db.get("identification_type"),
        "identification_number": patient_db.get("identification_number"),
        "first_name": patient_db.get("first_name"),
        "second_name": patient_db.get("second_name"),
        "first_lastname": patient_db.get("first_lastname"),
        "second_lastname": patient_db.get("second_lastname"),
        "full_name": patient_db.get("full_name"),
        "gender": patient_db.get("gender"),
        "birth_date": patient_db.get("birth_date"),
        "phone": patient_db.get("phone"),
        "email": patient_db.get("email"),
        "care_type": patient_db.get("care_type"),
        "entity_info": patient_db.get("entity_info"),
        "location": patient_db.get("location"),
        "observations": patient_db.get("observations"),
    }

    return {
        "legacy_id": legacy_id,
        "is_legacy": True,
        "patient_id": patient_ref,
        "patient": patient_snapshot,
        "entity": entity_name or None,
        "care_type": care_type or None,
        "previous_study": row.get("Previous study", "").strip() or None,
        "received_at": _parse_date(row.get("Date of receipt of the sample", "")),
        "closed_at": _parse_date(row.get("Close date", "")),
        "transcription_date": _parse_date(row.get("Transcription date", "")),
        "samples": samples_map.get(legacy_id, []),
        "imported_at": datetime.now(timezone.utc),
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Importar casos legacy desde CSV")
    parser.add_argument("--casos", required=True, help="Ruta al CSV de casos_(citas).csv")
    parser.add_argument("--muestras", required=True, help="Ruta al CSV de muestras_de_laboratorio.csv")
    args = parser.parse_args()

    print(f"Conectando a {MONGO_URI} / {MONGO_DB} ...")
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]
    coll = db["cases_legacy"]

    coll.drop()
    print("Colección cases_legacy eliminada.")

    # Índices
    coll.create_index([("legacy_id", ASCENDING)], unique=True)
    coll.create_index([("patient.identification", ASCENDING)])
    coll.create_index([("patient.full_name", ASCENDING)])
    coll.create_index([("entity", ASCENDING)])
    coll.create_index([("received_at", ASCENDING)])
    coll.create_index([("closed_at", ASCENDING)])
    print("Índices creados.")

    print(f"Cargando muestras desde {args.muestras} ...")
    samples_map = load_samples(args.muestras)
    print(f"  {sum(len(v) for v in samples_map.values())} muestras en {len(samples_map)} citas.")

    print(f"Procesando casos desde {args.casos} ...")
    docs = []
    skipped = 0
    with open(args.casos, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            doc = build_document(row, samples_map)
            # Solo importar si tiene fecha de cierre/corte y paciente válido
            if not doc or not doc["legacy_id"] or doc["legacy_id"] == "D/" or not doc["closed_at"]:
                skipped += 1
                continue
            docs.append(doc)

    print(f"  {len(docs)} casos listos, {skipped} omitidos.")

    # Insertar en lotes, ignorando duplicados (upsert por legacy_id)
    inserted = 0
    updated = 0
    errors = 0
    batch = 200
    for i in range(0, len(docs), batch):
        chunk = docs[i:i + batch]
        for doc in chunk:
            try:
                result = coll.update_one(
                    {"legacy_id": doc["legacy_id"]},
                    {"$set": doc},
                    upsert=True,
                )
                if result.upserted_id:
                    inserted += 1
                else:
                    updated += 1
            except Exception as e:
                errors += 1
                print(f"  Error en {doc['legacy_id']}: {e}")
        print(f"  Procesados {min(i + batch, len(docs))}/{len(docs)}...")

    print(f"\nListo: {inserted} insertados, {updated} actualizados, {errors} errores.")
    client.close()


if __name__ == "__main__":
    main()
