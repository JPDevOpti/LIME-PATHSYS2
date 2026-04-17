import copy
import re
from datetime import date, datetime, timedelta, UTC
from typing import Any, Optional

from app.core.business_days import calculate_opportunity_days, get_business_days_cutoff
from app.core.date_utils import format_iso_datetime, mongo_created_at_range_from_strings

from bson import ObjectId
from pymongo.collection import Collection
from pymongo.cursor import Cursor
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError


def _round_decimal(val: Optional[float]) -> Optional[float]:
    """Redondea a 2 decimales."""
    if val is None:
        return None
    return round(float(val), 2)


def _contains_regex(value: str) -> dict[str, str]:
    """Construye regex case-insensitive escapando caracteres especiales de entrada."""
    return {"$regex": re.escape(value), "$options": "i"}


def _update_date_info(date_info: list, field: str, now: datetime) -> list:
    """Actualiza un campo específico en el único objeto dentro de la lista date_info."""
    if not date_info or not isinstance(date_info, list):
        date_info = [{}]
    if len(date_info) == 0:
        date_info.append({})
    date_info[0][field] = now
    return date_info


def _update_opportunity_info(opp_info: list, field: str, value: Any) -> list:
    """Actualiza un campo específico en el único objeto dentro de la lista opportunity_info."""
    if not opp_info or not isinstance(opp_info, list):
        opp_info = [{}]
    if len(opp_info) == 0:
        opp_info.append({})
    opp_info[0][field] = value
    return opp_info


def _strip_legacy_opportunity_extras(opp_info: list) -> None:
    """Quita claves obsoletas; solo persistimos opportunity_time, max_opportunity_time, was_timely."""
    if opp_info and len(opp_info) > 0 and isinstance(opp_info[0], dict):
        opp_info[0].pop("previous_max_opportunity_time", None)


def _parse_mongo_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date) and not isinstance(value, datetime):
        return datetime(value.year, value.month, value.day)
    s = str(value).strip()
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def _derive_opportunity_elapsed_days(doc: dict | None) -> float | None:
    """Días hábiles transcurridos si falta opportunity_time (p. ej. legacy); creación → firma o entrega."""
    if not doc:
        return None
    date_info = doc.get("date_info") or []
    if not date_info or not isinstance(date_info[0], dict):
        return None
    di0 = date_info[0]
    start = _parse_mongo_datetime(di0.get("created_at"))
    end = _parse_mongo_datetime(di0.get("signed_at")) or _parse_mongo_datetime(di0.get("delivered_at"))
    if not start or not end:
        return None
    return float(calculate_opportunity_days(start, end))


def _convert_ts(ts: Any) -> str:
    """Convierte un timestamp (datetime u otro) a string ISO garantizando el indicador de zona horaria."""
    if isinstance(ts, datetime):
        return format_iso_datetime(ts)
    if isinstance(ts, str):
        return ts
    if hasattr(ts, "isoformat"):
        return format_iso_datetime(ts)  # type: ignore
    return str(ts)


def _normalize_additional_notes(value: Any) -> Optional[list[dict]]:
    """Normaliza notas adicionales (legacy strings o dicts) a lista de {text, date}."""
    if value is None:
        return None
    if not isinstance(value, list):
        return None

    normalized: list[dict] = []
    for item in value:
        if isinstance(item, dict):
            text = str(item.get("text") or item.get("note") or item.get("content") or "").strip()
            date = item.get("date")
            date_str = _convert_ts(date).strip() if date is not None else ""
            if text:
                normalized.append({"text": text, "date": date_str})
            continue

        if isinstance(item, str):
            note = item.strip()
            if note:
                normalized.append({"text": note, "date": ""})
            continue

    return normalized or None


def _doc_to_case(doc: dict) -> dict:
    """Convierte documento MongoDB a formato API."""
    if not doc:
        return {}
    out = copy.deepcopy(doc)
    out["id"] = str(out["_id"])
    del out["_id"]

    # Convertir patient_info.patient_id de ObjectId a str
    if "patient_info" in out and isinstance(out["patient_info"], dict):
        pi = out["patient_info"]
        if "patient_id" in pi and isinstance(pi["patient_id"], ObjectId):
            pi["patient_id"] = str(pi["patient_id"])

    # Quitar updated_at de result (campo interno, no se expone)
    if "result" in out and isinstance(out["result"], dict) and "updated_at" in out["result"]:
        del out["result"]["updated_at"]

    # Centralizar campos de oportunidad en opportunity_info
    # Priorizar el array si ya existe persistido
    if isinstance(out.get("opportunity_info"), list) and len(out["opportunity_info"]) > 0:
        opp = out["opportunity_info"][0]
        opp["opportunity_time"] = _round_decimal(opp.get("opportunity_time"))
        opp["max_opportunity_time"] = _round_decimal(opp.get("max_opportunity_time"))
        # Legacy: no exponer campo antiguo en la API
        opp.pop("previous_max_opportunity_time", None)
    else:
        # Compatibilidad con documentos viejos o campos en raiz
        opp_time = out.get("opportunity_time")
        max_opp_time = out.get("max_opportunity_time")
        out["opportunity_info"] = [{
            "opportunity_time": _round_decimal(opp_time),
            "max_opportunity_time": _round_decimal(max_opp_time),
            "was_timely": out.get("was_timely"),
        }]

    for key in ("opportunity_time", "max_opportunity_time", "was_timely"):
        out.pop(key, None)

    # Convertir timestamps en audit_info
    if isinstance(out.get("audit_info"), list):
        for entry in out["audit_info"]:
            if isinstance(entry, dict) and "timestamp" in entry:
                entry["timestamp"] = _convert_ts(entry["timestamp"])
    else:
        out["audit_info"] = []

    # date_info viene persistido en MongoDB — solo convertir timestamps
    if isinstance(out.get("date_info"), list) and len(out["date_info"]) > 0:
        entry = out["date_info"][0]
        if isinstance(entry, dict):
            for k, v in entry.items():
                entry[k] = _convert_ts(v)
    else:
        out["date_info"] = []

    # Quitar fechas sueltas de la respuesta (no se exponen al cliente)
    for key in ("created_at", "updated_at", "signed_at", "delivered_at", "transcribed_at"):
        out.pop(key, None)

    # Compatibilidad de datos legacy para response_model (list[str])
    out["additional_notes"] = _normalize_additional_notes(out.get("additional_notes"))

    # Normalizar entity a objeto {id, name}
    raw_entity = out.get("entity")
    if isinstance(raw_entity, dict):
        # Ya es objeto, asegurar que tenga id y name
        out["entity"] = {
            "id": raw_entity.get("id") or None,
            "name": raw_entity.get("name") or "",
        }
    elif isinstance(raw_entity, str) and raw_entity.strip():
        # Legacy: entity era un string con el nombre
        out["entity"] = {"id": None, "name": raw_entity}
    else:
        # No hay entity top-level, intentar poblar desde patient_info
        pi = out.get("patient_info") or {}
        ei = pi.get("entity_info") or {}
        entity_name = ei.get("entity_name") or ""
        out["entity"] = {"id": None, "name": entity_name}

    # Normalizar tests en samples: id→test_code con id como ObjectId
    if isinstance(out.get("samples"), list):
        for sample in out["samples"]:
            if isinstance(sample, dict) and isinstance(sample.get("tests"), list):
                for test in sample["tests"]:
                    if isinstance(test, dict) and "test_code" not in test:
                        # Legacy: el campo "id" contiene el test_code
                        test["test_code"] = test.pop("id", "")
                        test["id"] = None
    return out


def _patient_to_patient_info(patient: dict) -> dict:
    """Extrae campos para patient_info desde documento paciente."""
    exclude = {"id", "_id", "created_at", "updated_at", "audit_info"}
    info = {}
    for k, v in patient.items():
        key = k if k != "_id" else None
        if key and key not in exclude and v is not None:
            info[k] = v
    if "id" in patient:
        info["patient_id"] = patient["id"]
    elif "_id" in patient:
        info["patient_id"] = str(patient["_id"])
    return info


class CaseRepository:
    COLLECTION = "cases"
    COUNTERS_COLLECTION = "counters"

    def __init__(self, db: Database):
        self._coll: Collection = db[self.COLLECTION]
        self._counters: Collection = db[self.COUNTERS_COLLECTION]
        self._users: Collection = db["users"]
        self._tests: Collection = db["tests"]

    @staticmethod
    def _collect_test_codes_upper_from_samples(samples: list) -> list[str]:
        codes: set[str] = set()
        for sample in samples or []:
            for t in sample.get("tests", []) or []:
                if not isinstance(t, dict):
                    continue
                code = str(t.get("test_code") or t.get("id") or "").strip()
                if code:
                    codes.add(code.upper())
        return list(codes)

    def _load_test_times_map(self, codes: list[str]) -> dict[str, float]:
        if not codes:
            return {}
        out: dict[str, float] = {}
        for doc in self._tests.find({"test_code": {"$in": codes}}, {"test_code": 1, "time": 1}):
            code = str(doc.get("test_code") or "").strip().upper()
            tim = doc.get("time")
            if not code or tim is None:
                continue
            try:
                t = float(tim)
                if t > 0:
                    out[code] = t
            except (TypeError, ValueError):
                pass
        return out

    def _calc_max_opportunity_from_samples(self, samples: list) -> float | None:
        """Máximo tiempo de oportunidad según el maestro de pruebas (mismo criterio que fix_max_opportunity_time)."""
        codes = self._collect_test_codes_upper_from_samples(samples)
        if not codes:
            return None
        test_times = self._load_test_times_map(codes)
        max_time: float | None = None
        for sample in samples or []:
            for t in sample.get("tests", []) or []:
                if not isinstance(t, dict):
                    continue
                code = str(t.get("test_code") or t.get("id") or "").strip().upper()
                t_time = test_times.get(code)
                if t_time is not None:
                    max_time = max(max_time, t_time) if max_time is not None else t_time
        return max_time

    def _find_user_for_pathologist_ref(self, ref: dict[str, Any]) -> Optional[dict[str, Any]]:
        projection = {"_id": 1, "name": 1, "pathologist_code": 1, "document": 1, "medical_license": 1}

        code = str(ref.get("pathologist_code") or "").strip()
        if code:
            filters: list[dict[str, Any]] = [{"pathologist_code": code}]
            try:
                filters.append({"pathologist_code": int(code)})
            except Exception:
                pass
            user = self._users.find_one({"$or": filters}, projection)
            if user:
                return user

        pid = str(ref.get("id") or "").strip()
        if pid:
            try:
                user = self._users.find_one({"_id": ObjectId(pid)}, projection)
                if user:
                    return user
            except Exception:
                pass

            filters = [{"pathologist_code": pid}, {"document": pid}]
            try:
                pid_int = int(pid)
                filters.extend([{"pathologist_code": pid_int}, {"document": pid_int}])
            except Exception:
                pass
            user = self._users.find_one({"$or": filters}, projection)
            if user:
                return user

        name = str(ref.get("name") or "").strip()
        if name:
            user = self._users.find_one(
                {"name": {"$regex": rf"^\s*{re.escape(name)}\s*$", "$options": "i"}},
                projection,
            )
            if user:
                return user

        return None

    def _normalize_pathologist_ref(self, value: Any) -> Any:
        if not isinstance(value, dict):
            return value

        ref: dict[str, Any] = {
            "id": str(value.get("id") or "").strip(),
            "name": str(value.get("name") or "").strip(),
        }

        incoming_code = str(value.get("pathologist_code") or "").strip()
        if incoming_code:
            ref["pathologist_code"] = incoming_code

        incoming_license = str(value.get("medical_license") or "").strip()
        if incoming_license:
            ref["medical_license"] = incoming_license

        incoming_role = str(value.get("role") or "").strip()
        if incoming_role:
            ref["role"] = incoming_role

        user = self._find_user_for_pathologist_ref(value)
        if user:
            if not ref.get("id"):
                ref["id"] = str(user.get("_id") or "")
            if not ref.get("name"):
                ref["name"] = str(user.get("name") or "")
            user_code = str(user.get("pathologist_code") or "").strip()
            if user_code:
                ref["pathologist_code"] = user_code
            user_license = str(user.get("medical_license") or "").strip()
            if user_license:
                ref["medical_license"] = user_license

        return ref

    def _normalize_pathologists_in_payload(self, data: dict[str, Any]) -> None:
        assigned = data.get("assigned_pathologist")
        if isinstance(assigned, dict):
            data["assigned_pathologist"] = self._normalize_pathologist_ref(assigned)

        assistants = data.get("assistant_pathologists")
        if isinstance(assistants, list):
            data["assistant_pathologists"] = [
                self._normalize_pathologist_ref(item) if isinstance(item, dict) else item
                for item in assistants
            ]

        resident = data.get("assigned_resident")
        if isinstance(resident, dict):
            data["assigned_resident"] = self._normalize_pathologist_ref(resident)

    def _sync_case_seq(self, year: int) -> None:
        """Sincroniza el contador con el máximo seq real en la colección para ese año."""
        key = f"case_seq_{year}"
        prefix = f"{year}-"
        pipeline = [
            {"$match": {"case_code": {"$regex": f"^{year}-\\d+$"}}},
            {"$project": {"seq": {"$toInt": {"$substr": ["$case_code", len(prefix), -1]}}}},
            {"$group": {"_id": None, "max_seq": {"$max": "$seq"}}},
        ]
        result = list(self._coll.aggregate(pipeline))
        max_seq = result[0]["max_seq"] if result else 0
        # Actualiza el contador solo si el real está por delante del almacenado
        self._counters.update_one(
            {"_id": key, "seq": {"$lt": max_seq}},
            {"$set": {"seq": max_seq}},
            upsert=False,
        )

    def _get_next_case_seq(self, year: int) -> int:
        key = f"case_seq_{year}"
        result = self._counters.find_one_and_update(
            {"_id": key},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result.get("seq", 1) if result else 1

    def _ensure_indexes(self) -> None:
        # Básicos y búsquedas rápidas
        self._coll.create_index("case_code", unique=True)
        self._coll.create_index("date_info.0.created_at")
        self._coll.create_index("date_info.0.signed_at")
        self._coll.create_index("state")
        self._coll.create_index("patient_info.patient_id")
        self._coll.create_index("entity.name")
        self._coll.create_index("assigned_pathologist.name")
        
        # Índices compuestos para listados y dashboards (Created + State)
        self._coll.create_index([("date_info.0.created_at", -1), ("state", 1)])
        
        # Índices para reportes de oportunidad (Statistics)
        # NOTA: No se pueden indexar date_info y opportunity_info en el mismo índice compuesto 
        # porque ambos son arrays (CannotIndexParallelArrays).
        self._coll.create_index([
            ("date_info.0.created_at", 1), 
            ("state", 1)
        ], name="idx_stats_date_state")
        
        self._coll.create_index("opportunity_info.0.was_timely", name="idx_opportunity_timely")
        
        # Índices para reportes de patólogos y facturación
        self._coll.create_index([("assigned_pathologist.name", 1), ("date_info.0.signed_at", 1)])
        
        # Otros filtros comunes en reportes
        self._coll.create_index("patient_info.care_type")
        self._coll.create_index("samples.tests.test_code")

    _SORT_FIELDS = {
        "case_code": "case_code",
        "patient": "patient_info.full_name",
        "entity": "entity.name",
        "pathologist": "assigned_pathologist.name",
        "status": "state",
        "created_at": "date_info.0.created_at",
        "priority": "priority",
        "doctor": "requesting_physician",
        "service": "service",
    }

    def find_many(
        self,
        search: Optional[str] = None,
        created_at_from: Optional[str] = None,
        created_at_to: Optional[str] = None,
        entity: Optional[str] = None,
        entity_names: Optional[list[str]] = None,
        assigned_pathologist: Optional[str] = None,
        pathologist_name: Optional[str] = None,
        assigned_pathologist_names: Optional[list[str]] = None,
        priority: Optional[str] = None,
        test: Optional[str] = None,
        test_codes: Optional[list[str]] = None,
        state: Optional[str] = None,
        states: Optional[list[str]] = None,
        doctor: Optional[str] = None,
        patient_id: Optional[str] = None,
        identification_number: Optional[str] = None,
        opportunity: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
        skip: int = 0,
        limit: int = 50,
        current_user: Optional[dict] = None,
    ) -> tuple[list[dict], int]:
        query: dict[str, Any] = {}
        and_conditions: list[dict] = []

        if search and search.strip():
            s = search.strip()
            and_conditions.append({
                "$or": [
                    {"case_code": _contains_regex(s)},
                    {"patient_info.full_name": _contains_regex(s)},
                    {"patient_info.identification_number": _contains_regex(s)},
                    {"requesting_physician": _contains_regex(s)},
                ]
            })

        if created_at_from or created_at_to:
            cr = mongo_created_at_range_from_strings(created_at_from, created_at_to)
            if cr:
                and_conditions.append({"date_info.0.created_at": cr})

        ens = [x.strip() for x in (entity_names or []) if isinstance(x, str) and x.strip()]
        if ens:
            and_conditions.append({"$or": [{"entity.name": _contains_regex(n)} for n in ens]})
        elif entity and entity.strip():
            and_conditions.append({"entity.name": _contains_regex(entity.strip())})

        apn_list = [
            x.strip() for x in (assigned_pathologist_names or []) if isinstance(x, str) and x.strip()
        ]
        if apn_list:
            and_conditions.append({
                "$or": [{"assigned_pathologist.name": _contains_regex(n)} for n in apn_list]
            })
        else:
            ap = assigned_pathologist.strip() if assigned_pathologist else ""
            pn = pathologist_name.strip() if pathologist_name else ""
            if ap:
                and_conditions.append({"assigned_pathologist.name": _contains_regex(ap)})
            if pn:
                rx_pn = _contains_regex(pn)
                and_conditions.append({
                    "$or": [
                        {"assigned_pathologist.name": rx_pn},
                        {"assistant_pathologists.name": rx_pn},
                    ]
                })

        if priority and priority.strip():
            and_conditions.append({"priority": priority.strip().capitalize()})

        st_list = [x.strip() for x in (states or []) if isinstance(x, str) and x.strip()]
        if st_list:
            and_conditions.append({"state": {"$in": st_list}})
        elif state and state.strip():
            and_conditions.append({"state": state.strip()})

        if doctor and doctor.strip():
            and_conditions.append({"requesting_physician": _contains_regex(doctor.strip())})

        tc_list = [
            x.strip() for x in (test_codes or []) if isinstance(x, str) and x.strip()
        ]
        if tc_list:
            and_conditions.append({
                "$or": [{"samples.tests.test_code": code} for code in tc_list]
            })
        elif test and test.strip():
            and_conditions.append({"samples.tests.test_code": test.strip()})

        if patient_id and patient_id.strip():
            try:
                and_conditions.append({"patient_info.patient_id": ObjectId(patient_id.strip())})
            except Exception:
                pass

        if identification_number and identification_number.strip():
            and_conditions.append({"patient_info.identification_number": identification_number.strip()})

        if opportunity and opportunity.strip():
            opp_val = opportunity.strip().lower()
            now = datetime.now(UTC)
            
            # Get cutoff dates for common max_opportunity_times
            cutoff_5 = get_business_days_cutoff(now, 5)
            cutoff_8 = get_business_days_cutoff(now, 8)
            cutoff_12 = get_business_days_cutoff(now, 12)
            
            # Filter for in-progress cases outside opportunity
            in_progress_fuera = {
                "state": {"$nin": ["Completado", "Por entregar"]},
                "$or": [
                    {"opportunity_info.max_opportunity_time": 5, "date_info.0.created_at": {"$lt": cutoff_5}},
                    {"opportunity_info.max_opportunity_time": 8, "date_info.0.created_at": {"$lt": cutoff_8}},
                    {"opportunity_info.max_opportunity_time": 12, "date_info.0.created_at": {"$lt": cutoff_12}},
                    {"opportunity_info.max_opportunity_time": {"$nin": [5, 8, 12]}, "date_info.0.created_at": {"$lt": cutoff_5}}
                ]
            }
            
            # Filter for in-progress cases inside opportunity
            in_progress_dentro = {
                "state": {"$nin": ["Completado", "Por entregar"]},
                "$or": [
                    {"opportunity_info.max_opportunity_time": 5, "date_info.0.created_at": {"$gte": cutoff_5}},
                    {"opportunity_info.max_opportunity_time": 8, "date_info.0.created_at": {"$gte": cutoff_8}},
                    {"opportunity_info.max_opportunity_time": 12, "date_info.0.created_at": {"$gte": cutoff_12}},
                    {"opportunity_info.max_opportunity_time": {"$nin": [5, 8, 12]}, "date_info.0.created_at": {"$gte": cutoff_5}}
                ]
            }

            if opp_val == "fuera":
                and_conditions.append({
                    "$or": [
                        {"opportunity_info.was_timely": False},
                        {"was_timely": False},
                        in_progress_fuera
                    ]
                })
            elif opp_val == "dentro":
                and_conditions.append({
                    "$or": [
                        {"opportunity_info.was_timely": True},
                        {"was_timely": True},
                        in_progress_dentro
                    ]
                })

        if current_user:
            role = str(current_user.get("role", "")).lower()
            if role in ("pathologist", "patologo", "patólogo", "patóloga"):
                user_id = str(current_user.get("id", ""))
                and_conditions.append({
                    "$or": [
                        {"assigned_pathologist.id": user_id},
                        {"assistant_pathologists.id": user_id},
                        {"state": "Completado"}
                    ]
                })

        if and_conditions:
            query["$and"] = and_conditions

        total = self._coll.count_documents(query)
        sort_field = self._SORT_FIELDS.get(sort_by or "", "date_info.0.created_at")
        sort_dir = -1 if (sort_order or "desc").lower() == "desc" else 1
        cursor: Cursor = self._coll.find(query).skip(skip).limit(limit).sort(sort_field, sort_dir)
        data = [_doc_to_case(d) for d in cursor]
        return data, total

    def find_by_id(self, id: str) -> Optional[dict]:
        try:
            oid = ObjectId(id)
        except Exception:
            return None
        doc = self._coll.find_one({"_id": oid})
        return _doc_to_case(doc) if doc else None

    def find_by_code(self, code: str) -> Optional[dict]:
        doc = self._coll.find_one({"case_code": code.strip()})
        return _doc_to_case(doc) if doc else None

    def create(self, data: dict, patient_info: dict, created_by_email: str | None = None, created_by_name: str | None = None, custom_case_code: str | None = None) -> dict:
        year = datetime.now(UTC).year
        self._sync_case_seq(year)
        stored_patient_info = dict(patient_info)
        if "patient_id" in stored_patient_info:
            try:
                stored_patient_info["patient_id"] = ObjectId(stored_patient_info["patient_id"])
            except Exception:
                pass
        data["patient_info"] = stored_patient_info
        self._normalize_pathologists_in_payload(data)
        # Remove legacy date fields to avoid duplication with date_info
        for key in ("sample_reception_date", "created_at", "updated_at"):
            data.pop(key, None)
        data["state"] = data.get("state") or "En recepción"
        now = datetime.now(UTC)
        user_email = created_by_email or "system"
        user_name = created_by_name or user_email
        data["audit_info"] = [{"action": "created", "user_name": user_name, "user_email": user_email, "timestamp": now}]
        data["date_info"] = [{"created_at": now, "update_at": now}]
        recalc_max: float | None = None
        if data.get("samples"):
            recalc_max = self._calc_max_opportunity_from_samples(data["samples"])
        if recalc_max is not None:
            max_opp = _round_decimal(recalc_max)
            data.pop("max_opportunity_time", None)
            data["opportunity_info"] = [{
                "max_opportunity_time": max_opp,
                "opportunity_time": None,
                "was_timely": None
            }]
        elif data.get("max_opportunity_time") is not None:
            max_opp = _round_decimal(data.pop("max_opportunity_time"))
            data["opportunity_info"] = [{
                "max_opportunity_time": max_opp,
                "opportunity_time": None,
                "was_timely": None
            }]
        
        if custom_case_code:
            data["case_code"] = custom_case_code.strip()
            try:
                result = self._coll.insert_one(data)
                doc = self._coll.find_one({"_id": result.inserted_id})
                return _doc_to_case(doc) if doc else {}
            except DuplicateKeyError:
                existing = self.find_by_code(data["case_code"])
                if existing:
                    return existing
                raise

        for _ in range(5):
            seq = self._get_next_case_seq(year)
            data["case_code"] = f"{year}-{seq:05d}"
            try:
                result = self._coll.insert_one(data)
                doc = self._coll.find_one({"_id": result.inserted_id})
                return _doc_to_case(doc) if doc else {}
            except DuplicateKeyError:
                data.pop("_id", None)
                continue
        raise RuntimeError(f"No se pudo generar un case_code único para el año {year} tras varios intentos")

    def update(
        self,
        id: str,
        data: dict,
        updated_by_email: str | None = None,
        updated_by_name: str | None = None,
        audit_action: str = "edited",
        audit_change_details: list[str] | None = None,
    ) -> Optional[dict]:
        try:
            oid = ObjectId(id)
        except Exception:
            return None
        for key in ("case_code", "patient_info", "created_at", "updated_at", "audit_info", "sample_reception_date"):
            data.pop(key, None)
        self._normalize_pathologists_in_payload(data)
        now = datetime.now(UTC)
        recalc_max: float | None = None
        if "samples" in data:
            recalc_max = self._calc_max_opportunity_from_samples(data["samples"])

        has_max_key = "max_opportunity_time" in data
        explicit_max = data.pop("max_opportunity_time", None) if has_max_key else None

        # max explícito del cliente gana sobre el recálculo por muestras
        resolved_max: float | None = None
        if has_max_key and explicit_max is not None:
            resolved_max = float(explicit_max)
        elif not has_max_key and recalc_max is not None:
            resolved_max = float(recalc_max)

        if resolved_max is not None:
            existing = self._coll.find_one({"_id": oid}, {"opportunity_info": 1, "date_info": 1})
            current_opp = (existing or {}).get("opportunity_info") or [{}]
            _strip_legacy_opportunity_extras(current_opp)
            max_opp = _round_decimal(resolved_max)
            current_opp = _update_opportunity_info(current_opp, "max_opportunity_time", max_opp)
            opp_days_f: float | None = None
            raw_ot = current_opp[0].get("opportunity_time")
            if raw_ot is not None:
                try:
                    opp_days_f = float(raw_ot)
                except (TypeError, ValueError):
                    pass
            if opp_days_f is None:
                opp_days_f = _derive_opportunity_elapsed_days(existing)
            if opp_days_f is not None:
                current_opp = _update_opportunity_info(
                    current_opp, "was_timely", opp_days_f <= float(max_opp)
                )
            data["opportunity_info"] = current_opp
        # Upsert de "updated" en date_info
        existing_doc = self._coll.find_one({"_id": oid}, {"date_info": 1})
        current_date_info = (existing_doc or {}).get("date_info") or []
        
        # Manejo de date_info basado en audit_action
        date_info = _update_date_info(current_date_info, "update_at", now)
        if audit_action == "delivered":
            date_info = _update_date_info(date_info, "delivered_at", now)
        
        data["date_info"] = date_info
        
        user_email = updated_by_email or "system"
        user_name = updated_by_name or user_email
        audit_entry: dict = {"action": audit_action, "user_name": user_name, "user_email": user_email, "timestamp": now}
        if audit_change_details and audit_action == "edited":
            audit_entry["details"] = audit_change_details[:40]

        self._coll.update_one(
            {"_id": oid},
            {"$set": data, "$push": {"audit_info": audit_entry}},
        )
        doc = self._coll.find_one({"_id": oid})
        return _doc_to_case(doc) if doc else None

    def update_transcription(
        self,
        id: str,
        result_data: dict,
        new_state: str | None,
        updated_by_email: str | None = None,
        updated_by_name: str | None = None,
        complementary_tests: list | None = None,
        complementary_tests_reason: str | None = None,
        approval_state: str | None = None,
        audit_action: str = "transcribed",
        samples: list | None = None,
    ) -> Optional[dict]:
        """Actualiza result y opcionalmente state del caso."""
        try:
            oid = ObjectId(id)
        except Exception:
            return None
        doc = self._coll.find_one({"_id": oid})
        if not doc:
            return None
        existing_result = doc.get("result") or {}
        merged = {**existing_result, **result_data}
        now = datetime.now(UTC)
        merged.pop("updated_at", None)
        set_data: dict = {"result": merged}
        if new_state:
            set_data["state"] = new_state
        if complementary_tests is not None:
            set_data["complementary_tests"] = complementary_tests
        if complementary_tests_reason is not None:
            set_data["complementary_tests_reason"] = complementary_tests_reason
        if approval_state is not None:
            set_data["approval_state"] = approval_state
        if samples is not None:
            set_data["samples"] = samples
            new_max = self._calc_max_opportunity_from_samples(samples)
            if new_max is not None:
                max_opp = _round_decimal(new_max)
                current_opp = doc.get("opportunity_info") or [{}]
                _strip_legacy_opportunity_extras(current_opp)
                current_opp = _update_opportunity_info(current_opp, "max_opportunity_time", max_opp)
                opp_days_f: float | None = None
                raw_ot = current_opp[0].get("opportunity_time")
                if raw_ot is not None:
                    try:
                        opp_days_f = float(raw_ot)
                    except (TypeError, ValueError):
                        pass
                if opp_days_f is None:
                    opp_days_f = _derive_opportunity_elapsed_days(doc)
                if opp_days_f is not None:
                    current_opp = _update_opportunity_info(
                        current_opp, "was_timely", opp_days_f <= float(max_opp)
                    )
                set_data["opportunity_info"] = current_opp
        # Upsert condicional en date_info según la acción
        current_date_info = doc.get("date_info") or []
        current_date_info = _update_date_info(current_date_info, "update_at", now)

        if audit_action == "signed":
            current_date_info = _update_date_info(current_date_info, "signed_at", now)
            # Calcular tiempo de oportunidad
            if current_date_info and len(current_date_info) > 0:
                created_at = current_date_info[0].get("created_at")
                if created_at:
                    opp_days = calculate_opportunity_days(created_at, now)
                    current_opp_info = set_data.get("opportunity_info") or doc.get("opportunity_info") or [{}]
                    _strip_legacy_opportunity_extras(current_opp_info)
                    current_opp_info = _update_opportunity_info(current_opp_info, "opportunity_time", float(opp_days))
                    max_opp = current_opp_info[0].get("max_opportunity_time")
                    if max_opp is not None:
                        current_opp_info = _update_opportunity_info(current_opp_info, "was_timely", opp_days <= max_opp)
                    set_data["opportunity_info"] = current_opp_info
        elif new_state == "Por firmar":
            current_date_info = _update_date_info(current_date_info, "transcribed_at", now)
        
        set_data["date_info"] = current_date_info
        user_email = updated_by_email or "system"
        user_name = updated_by_name or user_email
        audit_entry = {"action": audit_action, "user_name": user_name, "user_email": user_email, "timestamp": now}
        self._coll.update_one(
            {"_id": oid},
            {"$set": set_data, "$push": {"audit_info": audit_entry}},
        )
        updated = self._coll.find_one({"_id": oid})
        return _doc_to_case(updated) if updated else None

    def update_patient_info(
        self,
        id: str,
        patient_info: dict,
        updated_by_email: str | None = None,
        updated_by_name: str | None = None,
        audit_change_details: list[str] | None = None,
    ) -> Optional[dict]:
        """Actualiza específicamente el bloque patient_info de un caso."""
        try:
            oid = ObjectId(id)
        except Exception:
            return None

        set_data = {}
        for k, v in patient_info.items():
            if k == "patient_id" and v:
                try:
                    set_data[f"patient_info.{k}"] = ObjectId(str(v))
                except Exception:
                    set_data[f"patient_info.{k}"] = v
            else:
                set_data[f"patient_info.{k}"] = v

        now = datetime.now(UTC)
        user_email = updated_by_email or "system"
        user_name = updated_by_name or user_email
        audit_entry: dict = {
            "action": "edited",
            "user_name": user_name,
            "user_email": user_email,
            "timestamp": now,
        }
        if audit_change_details:
            prefixed = [f"Paciente — {line}" for line in audit_change_details[:35]]
            audit_entry["details"] = prefixed[:40]

        self._coll.update_one(
            {"_id": oid},
            {"$set": set_data, "$push": {"audit_info": audit_entry}},
        )
        doc = self._coll.find_one({"_id": oid})
        return _doc_to_case(doc) if doc else None

    def delete(self, id: str) -> bool:
        try:
            oid = ObjectId(id)
        except Exception:
            return False
        result = self._coll.delete_one({"_id": oid})
        return result.deleted_count > 0

    def find_additional_tests_requests(
        self,
        case_code: Optional[str] = None,
        approval_state: Optional[str] = None,
        entity: Optional[str] = None,
        pathologist_id: Optional[str] = None,
        test_code: Optional[str] = None,
        created_at_from: Optional[str] = None,
        created_at_to: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[dict], int]:
        """Lista casos con complementary_tests (solicitudes de pruebas adicionales)."""
        query: dict[str, Any] = {"complementary_tests": {"$exists": True, "$ne": []}}
        if case_code and case_code.strip():
            s = case_code.strip()
            query["case_code"] = _contains_regex(s)
        if approval_state and approval_state.strip():
            query["approval_state"] = approval_state.strip()
        if entity and entity.strip():
            query["entity.name"] = _contains_regex(entity.strip())
        if pathologist_id and pathologist_id.strip():
            query["assigned_pathologist.id"] = pathologist_id.strip()
        if test_code and test_code.strip():
            query["complementary_tests.code"] = test_code.strip()
        if created_at_from or created_at_to:
            cr = mongo_created_at_range_from_strings(created_at_from, created_at_to)
            if cr:
                query["created_at"] = cr
        total = self._coll.count_documents(query)
        cursor = self._coll.find(query).sort("created_at", -1).skip(skip).limit(limit)
        data = [_doc_to_case(d) for d in cursor]
        return data, total

    def update_approval_state(self, id: str, approval_state: str) -> Optional[dict]:
        """Actualiza approval_state del caso."""
        try:
            oid = ObjectId(id)
        except Exception:
            return None
        doc = self._coll.find_one({"_id": oid}, {"date_info": 1})
        now = datetime.now(UTC)
        current_date_info = (doc or {}).get("date_info") or []
        date_info = _update_date_info(current_date_info, "update_at", now)
        
        result = self._coll.update_one(
            {"_id": oid},
            {"$set": {"approval_state": approval_state, "date_info": date_info}},
        )
        if result.matched_count == 0:
            return None
        doc = self._coll.find_one({"_id": oid})
        return _doc_to_case(doc) if doc else None

    def update_complementary_tests(self, id: str, complementary_tests: list) -> Optional[dict]:
        """Actualiza complementary_tests del caso."""
        try:
            oid = ObjectId(id)
        except Exception:
            return None
        doc = self._coll.find_one({"_id": oid}, {"date_info": 1})
        now = datetime.now(UTC)
        current_date_info = (doc or {}).get("date_info") or []
        date_info = _update_date_info(current_date_info, "update_at", now)

        result = self._coll.update_one(
            {"_id": oid},
            {"$set": {"complementary_tests": complementary_tests, "date_info": date_info}},
        )
        if result.matched_count == 0:
            return None
        doc = self._coll.find_one({"_id": oid})
        return _doc_to_case(doc) if doc else None

    def add_note(self, id: str, text: str, date: str) -> Optional[dict]:
        """Agrega una nota adicional al caso."""
        try:
            oid = ObjectId(id)
        except Exception:
            return None
        note = {"text": text.strip(), "date": date}
        self._coll.update_one({"_id": oid}, {"$push": {"additional_notes": note}})
        doc = self._coll.find_one({"_id": oid})
        return _doc_to_case(doc) if doc else None

    def delete_note(self, id: str, note_index: int) -> Optional[dict]:
        """Elimina una nota adicional por índice."""
        try:
            oid = ObjectId(id)
        except Exception:
            return None
        # MongoDB no permite eliminar por índice directamente:
        # se marca como None y luego se hace pull de nulls
        self._coll.update_one(
            {"_id": oid},
            {"$unset": {f"additional_notes.{note_index}": 1}},
        )
        self._coll.update_one(
            {"_id": oid},
            {"$pull": {"additional_notes": None}},
        )
        doc = self._coll.find_one({"_id": oid})
        return _doc_to_case(doc) if doc else None

    def update_patient_info_in_cases(self, patient_id: str, patient: dict) -> int:
        """Actualiza patient_info en todos los casos que referencian a este paciente."""
        try:
            oid = ObjectId(patient_id)
        except Exception:
            return 0
        info = _patient_to_patient_info(patient)

        set_fields = {}
        for k, v in info.items():
            if k in ("age", "patient_id"):
                continue
            set_fields[f"patient_info.{k}"] = v

        # Recalculate age_at_diagnosis from birth_date
        birth_date_raw = patient.get("birth_date")
        if birth_date_raw is not None:
            age = self._calculate_age_from_birth(birth_date_raw)
            if age is not None:
                set_fields["patient_info.age_at_diagnosis"] = age

        if not set_fields:
            return 0

        # patient_id may be stored as ObjectId or string depending on when the case was created
        patient_id_filter = {"$or": [
            {"patient_info.patient_id": oid},
            {"patient_info.patient_id": patient_id},
        ]}

        result = self._coll.update_many(
            patient_id_filter,
            {"$set": set_fields},
        )
        return result.modified_count

    @staticmethod
    def _calculate_age_from_birth(birth_date_raw) -> int | None:
        """Calcula edad en años completos a partir de la fecha de nacimiento."""
        try:
            if isinstance(birth_date_raw, datetime):
                birth = birth_date_raw.date()
            elif isinstance(birth_date_raw, date):
                birth = birth_date_raw
            elif isinstance(birth_date_raw, str) and birth_date_raw.strip():
                birth = date.fromisoformat(str(birth_date_raw).strip()[:10])
            else:
                return None
            today = date.today()
            return (today.year - birth.year
                    - ((today.month, today.day) < (birth.month, birth.day)))
        except Exception:
            return None
