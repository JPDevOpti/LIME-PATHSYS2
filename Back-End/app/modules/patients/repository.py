import re
from datetime import datetime, timedelta
from typing import Any, Optional
from app.core.date_utils import format_iso_datetime

from bson import ObjectId
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.cursor import Cursor
from pymongo.errors import DuplicateKeyError
from fastapi import HTTPException


# Migración: valores numéricos antiguos a siglas
_ID_TYPE_LEGACY_TO_SIGLA = {
    0: "NN", 1: "CC", 2: "CE", 3: "TI", 4: "PA",
    5: "RC", 6: "DE", 7: "NIT", 8: "CD", 9: "SC",
}


def _doc_to_patient(doc: dict) -> dict:
    """Convierte documento MongoDB a formato API (id string, fechas ISO)."""
    if not doc:
        return {}
    out = dict(doc)
    out["id"] = str(doc["_id"])
    del out["_id"]
    for key in ("created_at", "updated_at"):
        if key in out and isinstance(out[key], datetime):
            out[key] = format_iso_datetime(out[key])
    if "birth_date" in out and isinstance(out.get("birth_date"), datetime):
        out["birth_date"] = out["birth_date"].strftime("%Y-%m-%d")
    # Migración: identification_type numérico a sigla
    it = out.get("identification_type")
    if isinstance(it, int) and it in _ID_TYPE_LEGACY_TO_SIGLA:
        out["identification_type"] = _ID_TYPE_LEGACY_TO_SIGLA[it]
    # audit_info: serializar timestamps si son datetime
    if "audit_info" in out and isinstance(out["audit_info"], list):
        for entry in out["audit_info"]:
            if isinstance(entry, dict) and "timestamp" in entry and isinstance(entry["timestamp"], datetime):
                entry["timestamp"] = format_iso_datetime(entry["timestamp"])
    if "audit_info" not in out:
        out["audit_info"] = []
    return out


class PatientRepository:
    COLLECTION = "patients"
    COUNTERS_COLLECTION = "counters"
    PATIENT_SEQ_KEY = "patient_seq"

    def __init__(self, db: Database):
        self._coll: Collection = db[self.COLLECTION]
        self._counters: Collection = db[self.COUNTERS_COLLECTION]

    def _get_next_seq(self) -> int:
        result = self._counters.find_one_and_update(
            {"_id": self.PATIENT_SEQ_KEY},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result.get("seq", 1)

    def _ensure_indexes(self) -> None:
        self._coll.create_index("patient_code", unique=True)
        self._coll.create_index([("identification_type", 1), ("identification_number", 1)], unique=True)
        self._coll.create_index("created_at")

    def find_many(
        self,
        search: Optional[str] = None,
        created_at_from: Optional[str] = None,
        created_at_to: Optional[str] = None,
        entity: Optional[str] = None,
        care_type: Optional[str] = None,
        gender: Optional[str] = None,
        municipality_code: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[dict], int]:
        query: dict[str, Any] = {}

        and_conditions: list[dict] = []
        if search and search.strip():
            s = re.escape(search.strip())
            and_conditions.append({
                "$or": [
                    {"full_name": {"$regex": s, "$options": "i"}},
                    {"patient_code": {"$regex": s, "$options": "i"}},
                    {"identification_number": {"$regex": s, "$options": "i"}},
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
            query["created_at"] = q

        if entity and entity.strip():
            query["entity_info.entity_name"] = {"$regex": entity.strip(), "$options": "i"}

        if care_type and care_type.strip():
            query["care_type"] = care_type.strip()

        if gender and gender.strip():
            query["gender"] = gender.strip()

        if municipality_code and municipality_code.strip():
            code = municipality_code.strip()
            and_conditions.append({
                "$or": [
                    {"location.municipality": {"$regex": code, "$options": "i"}},
                ]
            })

        if and_conditions:
            query["$and"] = and_conditions

        total = self._coll.count_documents(query)
        cursor: Cursor = self._coll.find(query).skip(skip).limit(limit).sort("created_at", -1)
        data = [_doc_to_patient(d) for d in cursor]
        return data, total

    def find_by_id(self, id: str) -> Optional[dict]:
        try:
            oid = ObjectId(id)
        except Exception:
            return None
        doc = self._coll.find_one({"_id": oid})
        return _doc_to_patient(doc) if doc else None

    def find_by_patient_code(self, patient_code: str) -> Optional[dict]:
        doc = self._coll.find_one({"patient_code": patient_code})
        return _doc_to_patient(doc) if doc else None

    @staticmethod
    def _clean_empty_strings(data: dict) -> dict:
        """Convierte strings vacíos a None en campos opcionales para no violar restricciones del backend."""
        optional_str_fields = {
            "second_name", "second_lastname", "birth_date", "phone", "email", "observations"
        }
        for field in optional_str_fields:
            if field in data and data[field] == "":
                data[field] = None
        if "entity_info" in data and isinstance(data["entity_info"], dict):
            if data["entity_info"].get("eps_name") == "":
                data["entity_info"]["eps_name"] = None
        if "location" in data and isinstance(data["location"], dict):
            for loc_field in ("country", "department", "municipality", "address"):
                if data["location"].get(loc_field) == "":
                    data["location"][loc_field] = None
        return data

    def create(self, data: dict, created_by_email: str | None = None) -> dict:
        data = self._clean_empty_strings(data)
        seq = self._get_next_seq()
        data["patient_code"] = f"P-{seq:05d}"
        parts = [
            data.get("first_name", ""),
            data.get("second_name") or "",
            data.get("first_lastname", ""),
            data.get("second_lastname") or "",
        ]
        data["full_name"] = " ".join(p for p in parts if p).strip()
        now = datetime.utcnow()
        data["created_at"] = now
        data["updated_at"] = now
        user_email = created_by_email or "system"
        data["audit_info"] = [
            {"action": "created", "user_email": user_email, "timestamp": now}
        ]
        try:
            result = self._coll.insert_one(data)
        except DuplicateKeyError:
            raise HTTPException(
                status_code=409,
                detail="Ya existe un paciente con ese tipo y número de identificación."
            )
        doc = self._coll.find_one({"_id": result.inserted_id})
        return _doc_to_patient(doc)

    def update(self, id: str, data: dict, updated_by_email: str | None = None) -> Optional[dict]:
        data = self._clean_empty_strings(data)
        try:
            oid = ObjectId(id)
        except Exception:
            return None
        if "full_name" in data:
            del data["full_name"]
        if "patient_code" in data:
            del data["patient_code"]
        if "created_at" in data:
            del data["created_at"]
        if "audit_info" in data:
            del data["audit_info"]
        data["updated_at"] = datetime.utcnow()
        parts = []
        if "first_name" in data or "first_lastname" in data:
            doc = self._coll.find_one({"_id": oid})
            if doc:
                fn = data.get("first_name", doc.get("first_name", ""))
                sn = data.get("second_name", doc.get("second_name") or "")
                fl = data.get("first_lastname", doc.get("first_lastname", ""))
                sl = data.get("second_lastname", doc.get("second_lastname") or "")
                data["full_name"] = " ".join(p for p in [fn, sn, fl, sl] if p).strip()
        user_email = updated_by_email or "system"
        audit_entry = {"action": "updated", "user_email": user_email, "timestamp": datetime.utcnow()}
        try:
            self._coll.update_one(
                {"_id": oid},
                {"$set": data, "$push": {"audit_info": audit_entry}},
            )
        except DuplicateKeyError:
            raise HTTPException(
                status_code=409,
                detail="Ya existe un paciente con ese tipo y número de identificación."
            )
        doc = self._coll.find_one({"_id": oid})
        return _doc_to_patient(doc) if doc else None

    def delete(self, id: str) -> bool:
        try:
            oid = ObjectId(id)
        except Exception:
            return False
        result = self._coll.delete_one({"_id": oid})
        return result.deleted_count > 0
