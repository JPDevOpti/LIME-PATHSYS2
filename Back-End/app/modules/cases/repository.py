import copy
import re
from datetime import datetime, timedelta, UTC
from typing import Any, Optional

from app.core.business_days import calculate_opportunity_days
from app.core.date_utils import format_iso_datetime

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

    if "entity" not in out and "patient_info" in out:
        pi = out.get("patient_info") or {}
        ei = pi.get("entity_info") or {}
        out["entity"] = ei.get("entity_name") or ""
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
        self._coll.create_index("case_code", unique=True)
        self._coll.create_index("date_info.0.created_at")
        self._coll.create_index("state")
        self._coll.create_index("patient_info.patient_id")
        self._coll.create_index([("date_info.0.created_at", -1), ("state", 1)])

    _SORT_FIELDS = {
        "case_code": "case_code",
        "patient": "patient_info.full_name",
        "entity": "patient_info.entity_info.entity_name",
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
        assigned_pathologist: Optional[str] = None,
        pathologist_name: Optional[str] = None,
        priority: Optional[str] = None,
        test: Optional[str] = None,
        state: Optional[str] = None,
        doctor: Optional[str] = None,
        patient_id: Optional[str] = None,
        identification_number: Optional[str] = None,
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
            q: dict[str, Any] = {}
            if created_at_from:
                q["$gte"] = datetime.fromisoformat(created_at_from.replace("Z", "+00:00"))
            if created_at_to:
                end = datetime.fromisoformat(created_at_to.replace("Z", "+00:00"))
                end = end.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
                q["$lt"] = end
            query["date_info.0.created_at"] = q

        if entity and entity.strip():
            query["patient_info.entity_info.entity_name"] = _contains_regex(entity.strip())

        if assigned_pathologist and assigned_pathologist.strip():
            query["assigned_pathologist.name"] = _contains_regex(assigned_pathologist.strip())

        if pathologist_name and pathologist_name.strip():
            name = pathologist_name.strip()
            and_conditions.append({
                "$or": [
                    {"assigned_pathologist.name": _contains_regex(name)},
                    {"assistant_pathologists.name": _contains_regex(name)},
                ]
            })

        if priority and priority.strip():
            query["priority"] = priority.strip().capitalize()

        if state and state.strip():
            query["state"] = state.strip()

        if doctor and doctor.strip():
            query["requesting_physician"] = _contains_regex(doctor.strip())

        if test and test.strip():
            and_conditions.append({"samples.tests.id": test.strip()})

        if patient_id and patient_id.strip():
            try:
                and_conditions.append({"patient_info.patient_id": ObjectId(patient_id.strip())})
            except Exception:
                pass

        if identification_number and identification_number.strip():
            query["patient_info.identification_number"] = identification_number.strip()

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
        if data.get("max_opportunity_time") is not None:
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

    def update(self, id: str, data: dict, updated_by_email: str | None = None, updated_by_name: str | None = None, audit_action: str = "edited") -> Optional[dict]:
        try:
            oid = ObjectId(id)
        except Exception:
            return None
        for key in ("case_code", "patient_info", "created_at", "updated_at", "audit_info", "sample_reception_date"):
            data.pop(key, None)
        self._normalize_pathologists_in_payload(data)
        now = datetime.now(UTC)
        if data.get("max_opportunity_time") is not None:
            max_opp = _round_decimal(data.pop("max_opportunity_time"))
            existing_doc_opp = self._coll.find_one({"_id": oid}, {"opportunity_info": 1})
            current_opp = (existing_doc_opp or {}).get("opportunity_info") or [{}]
            current_opp = _update_opportunity_info(current_opp, "max_opportunity_time", max_opp)
            
            # Re-evaluar was_timely si ya existe un tiempo de oportunidad (caso firmado)
            opp_time = current_opp[0].get("opportunity_time")
            if opp_time is not None:
                current_opp = _update_opportunity_info(current_opp, "was_timely", opp_time <= max_opp)
            
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
        audit_entry = {"action": audit_action, "user_name": user_name, "user_email": user_email, "timestamp": now}
        
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
                    current_opp_info = doc.get("opportunity_info") or [{}]
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
            query["patient_info.entity_info.entity_name"] = _contains_regex(entity.strip())
        if pathologist_id and pathologist_id.strip():
            query["assigned_pathologist.id"] = pathologist_id.strip()
        if test_code and test_code.strip():
            query["complementary_tests.code"] = test_code.strip()
        if created_at_from or created_at_to:
            q: dict[str, Any] = {}
            if created_at_from:
                q["$gte"] = datetime.fromisoformat(created_at_from.replace("Z", "+00:00"))
            if created_at_to:
                end = datetime.fromisoformat(created_at_to.replace("Z", "+00:00"))
                end = end.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
                q["$lt"] = end
            query["created_at"] = q
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
        
        # We don't overwrite the whole patient_info object because it contains the frozen age and misses birth_date.
        # So we only set specific fields.
        set_fields = {}
        for k, v in info.items():
            if k not in ("birth_date", "age", "patient_id"):
                set_fields[f"patient_info.{k}"] = v
                
        if not set_fields:
            return 0
            
        # We don't update date_info here to avoid complexity in update_many, 
        # but we remove the redundant top-level updated_at.
        
        result = self._coll.update_many(
            {"patient_info.patient_id": oid},
            {"$set": set_fields},
        )
        return result.modified_count
