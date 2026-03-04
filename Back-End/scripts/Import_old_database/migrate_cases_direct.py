#!/usr/bin/env python3
"""
Migración directa de casos: Atlas (lime_pathsys) → local (pathsys).

Transformaciones:
  - patient_info: reconstruido desde la colección local de pacientes
      · name → first_name / second_name / first_lastname / second_lastname
      · identification_type int → string
      · entity_info {id,name} → {entity_name, eps_name}
      · age → age_at_diagnosis
      · patient_id (ObjectId referencia al paciente local)
  - assigned_resident → assistant_pathologists[]
    - Fechas sueltas → date_info[0] {created_at, update_at, signed_at, delivered_at}
    - opportunity_info:
            · max_opportunity_time = mayor time de las pruebas del caso (colección tests)
            · opportunity_time = días hábiles entre created_at y signed_at
            · was_timely = opportunity_time <= max_opportunity_time
  - state: "En proceso"→"En recepción", "Por entregar"→"Completado"
  - result.observations descartado (campo no existe en nuevo schema)
  - case_code preservado ("2026-00001")
  - Contadores case_seq_{year} sincronizados al terminar

Uso:
    python3 migrate_cases_direct.py [--dry-run] [--batch-size N]
"""

import sys
import argparse
import re
from datetime import datetime, timezone, date, timedelta
from pymongo import MongoClient, InsertOne
from pymongo.errors import BulkWriteError
from bson import ObjectId

# ── Configuración ─────────────────────────────────────────────────────────────

ATLAS_URL  = "mongodb+srv://juanrestrepo183:cHp6ewrNmsPxfwfG@cluster0.o8uta.mongodb.net/"
ATLAS_DB   = "lime_pathsys"

LOCAL_URL  = "mongodb://localhost:27017"
LOCAL_DB   = "pathsys"

DEFAULT_BATCH_SIZE = 200
DEFAULT_MAX_OPPORTUNITY_TIME = 5.0

# ── Mapeo identification_type ─────────────────────────────────────────────────

ID_TYPE_MAP = {
    0: "NN", 1: "CC",  2: "CE",  3: "TI", 4: "PA",
    5: "RC", 6: "DE",  7: "NIT", 8: "CD", 9: "SC",
    10: "NN", 11: "NN", 12: "PA",
}

def map_id_type(raw) -> str:
    if isinstance(raw, int):
        return ID_TYPE_MAP.get(raw, "NN")
    if isinstance(raw, str):
        u = raw.upper()
        return u if u in ID_TYPE_MAP.values() else "NN"
    return "NN"


# ── Mapeo de estados ──────────────────────────────────────────────────────────

STATE_MAP = {
    "completado":    "Completado",
    "por firmar":    "Por firmar",
    "por entregar":  "Por entregar",
    "en proceso":    "En recepción",
    # Estados que no aplican en el nuevo sistema → recepción
    "corte macro":   "En recepción",
    "corte micro":   "En recepción",
}

def map_state(raw: str | None) -> str:
    if not raw:
        return "En recepción"
    return STATE_MAP.get(raw.strip().lower(), "En recepción")


# ── Parseo de fechas ──────────────────────────────────────────────────────────

def parse_dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo:
            return value.astimezone(timezone.utc).replace(tzinfo=None)
        return value
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value)
        except Exception:
            return None
    try:
        s = str(value).strip()
        if not s:
            return None

        try:
            iso = datetime.fromisoformat(s.replace("Z", "+00:00"))
            if iso.tzinfo:
                return iso.astimezone(timezone.utc).replace(tzinfo=None)
            return iso
        except ValueError:
            pass

        # Formato "2026-01-02 14:20:01.545000"
        for fmt in (
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d",
        ):
            try:
                return datetime.strptime(s[:26], fmt)
            except ValueError:
                continue
    except Exception:
        pass
    return None


def parse_birth_date(value) -> str | None:
    if not value:
        return None
    dt = parse_dt(value)
    return dt.strftime("%Y-%m-%d") if dt else (str(value)[:10] if value else None)


# ── Cálculo de días hábiles (fines de semana + festivos Colombia) ───────────

def get_easter_date(year: int) -> date:
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


def get_emiliani_monday(d: date) -> date:
    if d.weekday() == 0:
        return d
    return d + timedelta(days=(7 - d.weekday()))


def get_colombian_holidays(year: int) -> set[date]:
    holidays: set[date] = set()

    holidays.add(date(year, 1, 1))
    holidays.add(date(year, 5, 1))
    holidays.add(date(year, 7, 20))
    holidays.add(date(year, 8, 7))
    holidays.add(date(year, 12, 8))
    holidays.add(date(year, 12, 25))

    holidays.add(get_emiliani_monday(date(year, 1, 6)))
    holidays.add(get_emiliani_monday(date(year, 3, 19)))
    holidays.add(get_emiliani_monday(date(year, 6, 29)))
    holidays.add(get_emiliani_monday(date(year, 8, 15)))
    holidays.add(get_emiliani_monday(date(year, 10, 12)))
    holidays.add(get_emiliani_monday(date(year, 11, 1)))
    holidays.add(get_emiliani_monday(date(year, 11, 11)))

    easter = get_easter_date(year)
    holidays.add(easter - timedelta(days=3))
    holidays.add(easter - timedelta(days=2))
    holidays.add(get_emiliani_monday(easter + timedelta(days=43)))
    holidays.add(get_emiliani_monday(easter + timedelta(days=64)))
    holidays.add(get_emiliani_monday(easter + timedelta(days=71)))

    return holidays


def calculate_opportunity_days(start_dt: datetime, end_dt: datetime) -> int:
    s = start_dt.replace(tzinfo=None) if start_dt.tzinfo else start_dt
    e = end_dt.replace(tzinfo=None) if end_dt.tzinfo else end_dt
    if s > e:
        return 0

    current_date = s.date()
    end_date = e.date()

    all_holidays: set[date] = set()
    for y in range(current_date.year, end_date.year + 1):
        all_holidays.update(get_colombian_holidays(y))

    business_days = 0
    temp_date = current_date
    while temp_date < end_date:
        temp_date += timedelta(days=1)
        if temp_date.weekday() >= 5:
            continue
        if temp_date in all_holidays:
            continue
        business_days += 1

    return business_days


def _norm_test_key(value) -> str:
    return str(value or "").strip().upper()


def _norm_lookup_key(value) -> str:
    return str(value or "").strip().upper()


def build_tests_time_map(dst_tests, src_tests) -> dict[str, float]:
    out: dict[str, float] = {}

    def _save_time(key: str, raw_time):
        try:
            t = float(raw_time)
        except Exception:
            return
        if t <= 0:
            return
        if key:
            out[key] = max(out.get(key, 0.0), t)

    for coll in (dst_tests, src_tests):
        for t in coll.find({}, {"_id": 1, "test_code": 1, "time": 1}):
            _save_time(_norm_test_key(t.get("test_code")), t.get("time"))
            _save_time(_norm_test_key(t.get("_id")), t.get("time"))

    return out


def pick_max_opportunity_time(samples: list, tests_time_map: dict[str, float]) -> float:
    max_time = DEFAULT_MAX_OPPORTUNITY_TIME
    for sample in samples or []:
        for t_info in sample.get("tests", []) or []:
            t_id = _norm_test_key(t_info.get("id"))
            t_time = tests_time_map.get(t_id)
            if t_time is not None:
                max_time = max(max_time, t_time)
    return float(max_time)


def build_pathologists_maps(users_coll):
    by_oid: dict[str, dict] = {}
    by_code: dict[str, dict] = {}
    by_document: dict[str, dict] = {}

    for u in users_coll.find(
        {"role": "pathologist"},
        {"_id": 1, "name": 1, "pathologist_code": 1, "document": 1},
    ):
        oid = str(u.get("_id") or "").strip()
        if oid:
            by_oid[oid] = u

        code_key = _norm_lookup_key(u.get("pathologist_code"))
        if code_key and code_key not in by_code:
            by_code[code_key] = u

        doc_key = _norm_lookup_key(u.get("document"))
        if doc_key and doc_key not in by_document:
            by_document[doc_key] = u

    return by_oid, by_code, by_document


# ── Partición de nombre completo (fallback si no se encuentra el paciente) ────

def split_full_name(name: str) -> tuple[str, str | None, str, str | None]:
    """
    Heurística para dividir 'Nombre1 Nombre2 Apellido1 Apellido2'.
    2 tokens → (N1, None, A1, None)
    3 tokens → (N1, None, A1, A2)
    4+ tokens → (N1, N2, A1, A2)
    """
    parts = name.strip().split()
    if len(parts) == 0:
        return ("", None, "", None)
    if len(parts) == 1:
        return (parts[0], None, "", None)
    if len(parts) == 2:
        return (parts[0], None, parts[1], None)
    if len(parts) == 3:
        return (parts[0], None, parts[1], parts[2])
    return (parts[0], parts[1], parts[2], " ".join(parts[3:]))


# ── Construcción de patient_info ──────────────────────────────────────────────

def build_patient_info(old_pi: dict, local_patient: dict | None) -> dict:
    """
    Construye el patient_info embebido del nuevo formato.
    Prioriza datos del paciente local; usa los del caso viejo como fallback.
    """
    id_type = map_id_type(old_pi.get("identification_type"))
    id_num  = str(old_pi.get("identification_number") or "").strip()
    age_at_diagnosis = old_pi.get("age")

    if local_patient:
        patient_oid = local_patient["_id"]
        if isinstance(patient_oid, str):
            try:
                patient_oid = ObjectId(patient_oid)
            except Exception:
                pass
        return {
            "patient_id":            patient_oid,
            "patient_code":          local_patient.get("patient_code", ""),
            "identification_type":   local_patient.get("identification_type", id_type),
            "identification_number": local_patient.get("identification_number", id_num),
            "first_name":            local_patient.get("first_name", ""),
            "second_name":           local_patient.get("second_name"),
            "first_lastname":        local_patient.get("first_lastname", ""),
            "second_lastname":       local_patient.get("second_lastname"),
            "full_name":             local_patient.get("full_name", old_pi.get("name", "")),
            "birth_date":            local_patient.get("birth_date"),
            "age_at_diagnosis":      age_at_diagnosis,
            "gender":                local_patient.get("gender", old_pi.get("gender", "")),
            "phone":                 local_patient.get("phone"),
            "email":                 local_patient.get("email"),
            "care_type":             local_patient.get("care_type", old_pi.get("care_type", "Ambulatorio")),
            "entity_info":           local_patient.get("entity_info", {
                                         "entity_name": (old_pi.get("entity_info") or {}).get("name"),
                                         "eps_name": None,
                                     }),
            "location":              local_patient.get("location", {
                                         "country": None, "department": None,
                                         "municipality": None, "subregion": None, "address": None,
                                     }),
            "observations":          local_patient.get("observations"),
        }

    # Fallback: construir desde datos del caso viejo
    full_name = old_pi.get("name", "")
    fn, sn, fl, sl = split_full_name(full_name)
    old_loc = old_pi.get("location") or {}

    return {
        "patient_id":            None,
        "patient_code":          old_pi.get("patient_code", ""),
        "identification_type":   id_type,
        "identification_number": id_num,
        "first_name":            fn,
        "second_name":           sn,
        "first_lastname":        fl,
        "second_lastname":       sl,
        "full_name":             full_name,
        "birth_date":            parse_birth_date(old_pi.get("birth_date")),
        "age_at_diagnosis":      age_at_diagnosis,
        "gender":                old_pi.get("gender", "Masculino"),
        "phone":                 None,
        "email":                 None,
        "care_type":             old_pi.get("care_type", "Ambulatorio"),
        "entity_info": {
            "entity_name": (old_pi.get("entity_info") or {}).get("name"),
            "eps_name":    None,
        },
        "location": {
            "country":      None,
            "department":   None,
            "municipality": old_loc.get("municipality_name") or None,
            "subregion":    old_loc.get("subregion") or None,
            "address":      old_loc.get("address") or None,
        },
        "observations": old_pi.get("observations"),
    }


# ── Construcción del resultado ────────────────────────────────────────────────

def build_result(old_result: dict | None) -> dict | None:
    if not old_result:
        return None
    r: dict = {}
    if old_result.get("method"):
        r["method"] = old_result["method"]
    if old_result.get("macro_result"):
        r["macro_result"] = old_result["macro_result"]
    if old_result.get("micro_result"):
        r["micro_result"] = old_result["micro_result"]
    if old_result.get("diagnosis"):
        r["diagnosis"] = old_result["diagnosis"]
    # cie10_diagnosis: preservar si existe
    if old_result.get("cie10_diagnosis"):
        r["cie10_diagnosis"] = old_result["cie10_diagnosis"]
    # cieo_diagnosis: no existía en el sistema viejo
    r["cieo_diagnosis"]    = None
    r["diagnosis_images"]  = None
    # observations (viejo) descartado — no existe en nuevo schema
    return r if r else None


# ── Construcción del pathologist (strip de campos no usados) ──────────────────

def build_pathologist(
    raw: dict | None,
    pathologists_by_oid: dict[str, dict],
    pathologists_by_code: dict[str, dict],
    pathologists_by_document: dict[str, dict],
) -> dict | None:
    if not raw:
        return None

    raw_id = str(raw.get("id") or "").strip()
    candidate = None
    if raw_id:
        candidate = pathologists_by_oid.get(raw_id)
        if candidate is None:
            candidate = pathologists_by_code.get(_norm_lookup_key(raw_id))
        if candidate is None:
            candidate = pathologists_by_document.get(_norm_lookup_key(raw_id))

    if candidate is None:
        return None

    return {
        "id": str(candidate.get("_id")),
        "name": candidate.get("name") or raw.get("name", ""),
    }


# ── Transformación principal ──────────────────────────────────────────────────

def transform_case(
    old: dict,
    local_patient: dict | None,
    now: datetime,
    tests_time_map: dict[str, float],
    pathologists_by_oid: dict[str, dict],
    pathologists_by_code: dict[str, dict],
    pathologists_by_document: dict[str, dict],
) -> tuple[dict, bool]:
    old_pi = old.get("patient_info") or {}

    created_at   = parse_dt(old.get("created_at"))   or now
    updated_at   = parse_dt(old.get("updated_at"))   or now
    signed_at    = parse_dt(old.get("signed_at"))
    delivered_at = parse_dt(old.get("delivered_at"))

    assigned_pathologist_raw = old.get("assigned_pathologist")
    assigned_pathologist = build_pathologist(
        assigned_pathologist_raw,
        pathologists_by_oid,
        pathologists_by_code,
        pathologists_by_document,
    )
    has_unmapped_pathologist = bool(assigned_pathologist_raw) and assigned_pathologist is None

    # assigned_resident del viejo → assistant_pathologists del nuevo
    assistant_pathologists = []
    if old.get("assigned_resident"):
        ap = build_pathologist(
            old["assigned_resident"],
            pathologists_by_oid,
            pathologists_by_code,
            pathologists_by_document,
        )
        if ap is None:
            has_unmapped_pathologist = True
        if ap:
            assistant_pathologists.append(ap)

    # Observations: strip espacios sobrantes comunes en los datos viejos
    observations = (old.get("observations") or "").strip() or None

    # entity: nombre de la entidad del paciente
    entity = (old_pi.get("entity_info") or {}).get("name") or None

    samples = old.get("samples") or []
    max_opp_time = pick_max_opportunity_time(samples, tests_time_map)

    opp_time = None
    if created_at and signed_at:
        opp_time = float(calculate_opportunity_days(created_at, signed_at))
    else:
        bdays = old.get("business_days")
        if bdays is not None:
            try:
                opp_time = float(bdays)
            except Exception:
                opp_time = None

    was_timely = (opp_time <= max_opp_time) if opp_time is not None else None

    doc = {
        "case_code":                  old["case_code"],
        "state":                      map_state(old.get("state")),
        "priority":                   old.get("priority") or "Normal",
        "service":                    (old.get("service") or "").strip() or None,
        "requesting_physician":       (old.get("requesting_physician") or "").strip(),
        "assigned_pathologist":       assigned_pathologist,
        "assistant_pathologists":     assistant_pathologists,
        "patient_info":               build_patient_info(old_pi, local_patient),
        "samples":                    samples,
        "observations":               observations,
        "entity":                     entity,
        "previous_study":             None,
        "additional_notes":           old.get("additional_notes") or [],
        "complementary_tests":        [],
        "complementary_tests_reason": None,
        "approval_state":             None,
        "result":                     build_result(old.get("result")),
        "delivered_to":               (old.get("delivered_to") or "").strip() or None,
        "date_info": [{
            "created_at":    created_at,
            "update_at":     updated_at,
            "transcribed_at": None,
            "signed_at":     signed_at,
            "delivered_at":  delivered_at,
        }],
        "opportunity_info": [{
            "opportunity_time":     opp_time,
            "max_opportunity_time": max_opp_time,
            "was_timely":           was_timely,
        }],
        "audit_info": [{
            "action":     "created",
            "user_name":  "migration@system",
            "user_email": "migration@system",
            "timestamp":  created_at,
        }],
    }

    return doc, has_unmapped_pathologist


# ── Sincronizar contadores case_seq_{year} ────────────────────────────────────

def sync_case_counters(cases_coll, counters_coll):
    """
    Recalcula case_seq_{year} para cada año presente en los casos importados,
    igual que CaseRepository._sync_case_seq en el backend.
    """
    years_pipeline = [
        {"$match": {"case_code": {"$regex": r"^\d{4}-\d+$"}}},
        {"$project": {"year": {"$substr": ["$case_code", 0, 4]}}},
        {"$group": {"_id": "$year"}},
    ]
    years = [r["_id"] for r in cases_coll.aggregate(years_pipeline)]

    for year_str in years:
        try:
            year = int(year_str)
        except ValueError:
            continue
        pipeline = [
            {"$match": {"case_code": {"$regex": f"^{year}-\\d+$"}}},
            {"$project": {"seq": {"$toInt": {"$substr": ["$case_code", 5, -1]}}}},
            {"$group": {"_id": None, "max_seq": {"$max": "$seq"}}},
        ]
        result = list(cases_coll.aggregate(pipeline))
        max_seq = result[0]["max_seq"] if result else 0
        key = f"case_seq_{year}"
        counters_coll.update_one(
            {"_id": key},
            {"$set": {"seq": max_seq}},
            upsert=True,
        )
        print(f"  Contador {key} → {max_seq}")


# ── Main ──────────────────────────────────────────────────────────────────────

def run(
    dry_run: bool,
    batch_size: int,
    dest_url: str = LOCAL_URL,
    dest_db: str = LOCAL_DB,
):
    print("=" * 62)
    print("  MIGRACIÓN DIRECTA: casos lime_pathsys → pathsys (local)")
    print("=" * 62)
    print(f"  Modo       : {'DRY-RUN (sin cambios)' if dry_run else 'REAL'}")
    print(f"  Batch size : {batch_size}")
    print()

    # ── Conexiones ────────────────────────────────────────────────────────────
    print("Conectando a Atlas...")
    atlas = MongoClient(ATLAS_URL, serverSelectionTimeoutMS=15000)
    atlas.admin.command("ping")
    print("  Atlas OK")

    print("Conectando a MongoDB destino...")
    local = MongoClient(dest_url, serverSelectionTimeoutMS=5000)
    local.admin.command("ping")
    print(f"  Destino OK (db={dest_db})\n")

    src_cases     = atlas[ATLAS_DB]["cases"]
    src_tests     = atlas[ATLAS_DB]["tests"]
    dst_cases     = local[dest_db]["cases"]
    dst_patients  = local[dest_db]["patients"]
    dst_users     = local[dest_db]["users"]
    dst_tests     = local[dest_db]["tests"]
    dst_counters  = local[dest_db]["counters"]

    # ── Índices en destino ────────────────────────────────────────────────────
    if not dry_run:
        dst_cases.create_index("case_code", unique=True)
        dst_cases.create_index("date_info.0.created_at")
        dst_cases.create_index("state")
        dst_cases.create_index("patient_info.patient_id")
        dst_cases.create_index([("date_info.0.created_at", -1), ("state", 1)])

    # ── Cargar pacientes locales en memoria ───────────────────────────────────
    print("Cargando pacientes locales en memoria...")
    patients_map: dict[tuple, dict] = {}
    for p in dst_patients.find({}, {
        "_id": 1, "patient_code": 1, "identification_type": 1, "identification_number": 1,
        "first_name": 1, "second_name": 1, "first_lastname": 1, "second_lastname": 1,
        "full_name": 1, "birth_date": 1, "gender": 1, "phone": 1, "email": 1,
        "care_type": 1, "entity_info": 1, "location": 1, "observations": 1,
    }):
        it = p.get("identification_type")
        # Normalizar tipo (puede ser int si es documento viejo)
        if isinstance(it, int):
            it = ID_TYPE_MAP.get(it, "NN")
        id_num = str(p.get("identification_number") or "").strip()
        patients_map[(it, id_num)] = p
    print(f"  Pacientes cargados : {len(patients_map):,}")

    print("Cargando patólogos locales en memoria...")
    pathologists_by_oid, pathologists_by_code, pathologists_by_document = build_pathologists_maps(dst_users)
    print(f"  Patólogos cargados (por _id): {len(pathologists_by_oid):,}")
    print(f"  Patólogos con código         : {len(pathologists_by_code):,}")
    print(f"  Patólogos con documento      : {len(pathologists_by_document):,}")

    print("Cargando tiempos de pruebas (local + Atlas)...")
    tests_time_map = build_tests_time_map(dst_tests, src_tests)
    print(f"  Claves de pruebas con tiempo: {len(tests_time_map):,}")

    # ── Cargar case_codes existentes ──────────────────────────────────────────
    print("Cargando casos existentes en local...")
    existing_codes: set[str] = {
        d["case_code"] for d in dst_cases.find({}, {"case_code": 1})
    }
    print(f"  Casos ya existentes: {len(existing_codes):,}")

    # ── Total en origen ───────────────────────────────────────────────────────
    total_src = src_cases.count_documents({})
    print(f"\nCasos en Atlas: {total_src:,}")
    print(f"{'─'*62}")

    # ── Stats ─────────────────────────────────────────────────────────────────
    stats = {
        "inserted":        0,
        "skipped_dup":     0,
        "no_patient":      0,  # casos cuyo paciente no se encontró en local
        "no_pathologist":  0,  # casos importados sin patólogo mapeado
        "errors":          0,
    }
    now     = datetime.utcnow()
    batch:  list[InsertOne] = []
    processed = 0

    for old in src_cases.find({}).batch_size(batch_size):
        processed += 1
        code = old.get("case_code", "")

        # Saltar si ya existe
        if code in existing_codes:
            stats["skipped_dup"] += 1
            continue

        # Buscar paciente local
        old_pi   = old.get("patient_info") or {}
        id_type  = map_id_type(old_pi.get("identification_type"))
        id_num   = str(old_pi.get("identification_number") or "").strip()
        local_pt = patients_map.get((id_type, id_num))

        if local_pt is None:
            stats["no_patient"] += 1

        doc, has_unmapped_pathologist = transform_case(
            old,
            local_pt,
            now,
            tests_time_map,
            pathologists_by_oid,
            pathologists_by_code,
            pathologists_by_document,
        )
        if has_unmapped_pathologist:
            stats["no_pathologist"] += 1

        if dry_run:
            stats["inserted"] += 1
            existing_codes.add(code)
            continue

        # Transformar y agregar al lote
        batch.append(InsertOne(doc))
        existing_codes.add(code)

        # Flush de lote
        if len(batch) >= batch_size:
            try:
                res = dst_cases.bulk_write(batch, ordered=False)
                stats["inserted"] += res.inserted_count
            except BulkWriteError as bwe:
                stats["inserted"] += bwe.details.get("nInserted", 0)
                stats["errors"]   += len(bwe.details.get("writeErrors", []))
            batch = []

        if processed % 200 == 0 or processed == total_src:
            pct = processed * 100 // total_src
            print(
                f"  [{pct:3d}%] procesados={processed:,}  "
                f"insertados={stats['inserted']:,}  "
                f"saltados={stats['skipped_dup']:,}  "
                f"sin_paciente={stats['no_patient']:,}  "
                f"sin_patologo={stats['no_pathologist']:,}"
            )

    # Flush final
    if not dry_run and batch:
        try:
            res = dst_cases.bulk_write(batch, ordered=False)
            stats["inserted"] += res.inserted_count
        except BulkWriteError as bwe:
            stats["inserted"] += bwe.details.get("nInserted", 0)
            stats["errors"]   += len(bwe.details.get("writeErrors", []))

    # ── Sincronizar contadores ────────────────────────────────────────────────
    if not dry_run:
        print(f"\nSincronizando contadores case_seq_{{year}}...")
        sync_case_counters(dst_cases, dst_counters)

    atlas.close()
    local.close()

    # ── Resumen ───────────────────────────────────────────────────────────────
    print(f"\n{'─'*62}")
    print("RESULTADO")
    print(f"{'─'*62}")
    print(f"  Insertados               : {stats['inserted']:,}")
    print(f"  Saltados (ya existían)   : {stats['skipped_dup']:,}")
    print(f"  Sin paciente en local    : {stats['no_patient']:,}  (importados igual, sin patient_id)")
    print(f"  Sin patólogo mapeado     : {stats['no_pathologist']:,}  (importados igual)")
    print(f"  Errores                  : {stats['errors']:,}")
    print(f"  Total procesados         : {processed:,}")
    if dry_run:
        print("\n  DRY-RUN: ningún cambio realizado.")
    print("=" * 62)


# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Migra casos directamente de Atlas a MongoDB local"
    )
    parser.add_argument("--dry-run",    action="store_true", help="Simular sin escribir")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE,
                        help=f"Docs por lote (default: {DEFAULT_BATCH_SIZE})")
    parser.add_argument("--dest-url", default=LOCAL_URL, help="MongoDB URI destino")
    parser.add_argument("--dest-db", default=LOCAL_DB, help="Base de datos destino")
    args = parser.parse_args()
    run(
        dry_run=args.dry_run,
        batch_size=args.batch_size,
        dest_url=args.dest_url,
        dest_db=args.dest_db,
    )
