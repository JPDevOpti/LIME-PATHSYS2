import copy
from datetime import datetime, UTC
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
    ) -> tuple[list[dict], int]:
        query: dict[str, Any] = {}
        and_conditions: list[dict] = []

        if search and search.strip():
            s = search.strip()
            and_conditions.append({
                "$or": [
                    {"case_code": {"$regex": s, "$options": "i"}},
                    {"patient_info.full_name": {"$regex": s, "$options": "i"}},
                    {"patient_info.identification_number": {"$regex": s, "$options": "i"}},
                    {"requesting_physician": {"$regex": s, "$options": "i"}},
                ]
            })

        if created_at_from or created_at_to:
            q: dict[str, Any] = {}
            if created_at_from:
                q["$gte"] = datetime.fromisoformat(created_at_from.replace("Z", "+00:00"))
            if created_at_to:
                end = datetime.fromisoformat(created_at_to.replace("Z", "+00:00"))
                end = end.replace(hour=23, minute=59, second=59, microsecond=999999)
                q["$lte"] = end
            query["date_info.0.created_at"] = q

        if entity and entity.strip():
            query["patient_info.entity_info.entity_name"] = {"$regex": entity.strip(), "$options": "i"}

        if assigned_pathologist and assigned_pathologist.strip():
            query["assigned_pathologist.name"] = {"$regex": assigned_pathologist.strip(), "$options": "i"}

        if pathologist_name and pathologist_name.strip():
            name = pathologist_name.strip()
            and_conditions.append({
                "$or": [
                    {"assigned_pathologist.name": {"$regex": name, "$options": "i"}},
                    {"assistant_pathologists.name": {"$regex": name, "$options": "i"}},
                ]
            })

        if priority and priority.strip():
            query["priority"] = priority.strip().capitalize()

        if state and state.strip():
            query["state"] = state.strip()

        if doctor and doctor.strip():
            query["requesting_physician"] = {"$regex": doctor.strip(), "$options": "i"}

        if test and test.strip():
            and_conditions.append({"samples.tests.id": test.strip()})

        if patient_id and patient_id.strip():
            try:
                and_conditions.append({"patient_info.patient_id": ObjectId(patient_id.strip())})
            except Exception:
                pass

        if identification_number and identification_number.strip():
            query["patient_info.identification_number"] = identification_number.strip()

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
            query["case_code"] = {"$regex": s, "$options": "i"}
        if approval_state and approval_state.strip():
            query["approval_state"] = approval_state.strip()
        if entity and entity.strip():
            query["patient_info.entity_info.entity_name"] = {"$regex": entity.strip(), "$options": "i"}
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
                end = end.replace(hour=23, minute=59, second=59, microsecond=999999)
                q["$lte"] = end
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
