"""Repositorio de casos sin lectura."""

from datetime import datetime, timezone
from typing import Any, Optional

from app.core.date_utils import format_iso_datetime
from pymongo.collection import Collection
from pymongo.database import Database


class UnreadCasesRepository:
    COLLECTION = "unread_cases"
    COUNTERS_COLLECTION = "counters"

    def __init__(self, db: Database) -> None:
        self.collection: Collection = db[self.COLLECTION]
        self._counters: Collection = db[self.COUNTERS_COLLECTION]

    def _ensure_indexes(self) -> None:
        self.collection.create_index("case_code", unique=True)
        self.collection.create_index("entry_date")
        self.collection.create_index("status")
        self.collection.create_index("entity_code")

    def _doc_to_dict(self, doc: dict[str, Any]) -> dict[str, Any]:
        def normalize_date(value: Any) -> str | None:
            if value is None:
                return None
            if isinstance(value, dict) and "$date" in value:
                embedded = value.get("$date")
                if isinstance(embedded, str):
                    return embedded
                return str(embedded)
            return format_iso_datetime(value)

        return {
            "id": str(doc.get("_id", "")),
            "case_code": doc.get("case_code", ""),
            "is_special_case": doc.get("is_special_case", False),
            "document_type": doc.get("document_type"),
            "patient_document": doc.get("patient_document"),
            "patient_name": doc.get("patient_name"),
            "entity_code": doc.get("entity_code"),
            "entity_name": doc.get("entity_name"),
            "institution": doc.get("institution"),
            "notes": doc.get("notes"),
            "test_groups": doc.get("test_groups"),
            "number_of_plates": doc.get("number_of_plates"),
            "delivered_to": doc.get("delivered_to"),
            "delivery_date": normalize_date(doc.get("delivery_date")),
            "entry_date": normalize_date(doc.get("entry_date")),
            "received_by": doc.get("received_by"),
            "status": doc.get("status", "En proceso"),
            "created_at": normalize_date(doc.get("created_at")),
            "updated_at": normalize_date(doc.get("updated_at")),
            "updated_by": doc.get("updated_by"),
        }

    def find_many(
        self,
        search: Optional[str] = None,
        institution: Optional[str] = None,
        test_type: Optional[str] = None,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[dict[str, Any]], int]:
        q: dict[str, Any] = {}
        if search and search.strip():
            s = search.strip().lower()
            q["$or"] = [
                {"case_code": {"$regex": s, "$options": "i"}},
                {"patient_name": {"$regex": s, "$options": "i"}},
                {"patient_document": {"$regex": s, "$options": "i"}},
                {"institution": {"$regex": s, "$options": "i"}},
                {"entity_name": {"$regex": s, "$options": "i"}},
            ]
        if institution:
            q["institution"] = institution
        if status:
            q["status"] = status
        if test_type:
            s = test_type.strip()
            q["$or"] = q.get("$or", []) + [
                {"test_groups.type": s},
                {"test_groups.tests.code": s},
                {"test_groups.tests.name": {"$regex": s, "$options": "i"}}
            ]
        if date_from or date_to:
            q["entry_date"] = {}
            if date_from:
                q["entry_date"]["$gte"] = f"{date_from}T00:00:00.000Z"
            if date_to:
                q["entry_date"]["$lte"] = f"{date_to}T23:59:59.999Z"

        total = self.collection.count_documents(q)
        cursor = (
            self.collection.find(q)
            .sort("entry_date", -1)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        data = [self._doc_to_dict(d) for d in cursor]
        return data, total

    def find_by_case_code(self, case_code: str) -> Optional[dict[str, Any]]:
        doc = self.collection.find_one({"case_code": case_code})
        if not doc:
            return None
        return self._doc_to_dict(doc)

    def case_code_exists(self, case_code: str) -> bool:
        return self.collection.find_one({"case_code": case_code}) is not None

    def _get_next_sequence_for_year(self, year: int) -> int:
        key = f"ur_seq_{year}"
        result = self._counters.find_one_and_update(
            {"_id": key},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result.get("seq", 1)

    def create(self, data: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        data["created_at"] = now
        data["updated_at"] = now
        result = self.collection.insert_one(data)
        doc = self.collection.find_one({"_id": result.inserted_id})
        return self._doc_to_dict(doc) if doc else {}

    def update_by_case_code(
        self, case_code: str, data: dict[str, Any]
    ) -> Optional[dict[str, Any]]:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = self.collection.update_one(
            {"case_code": case_code}, {"$set": data}
        )
        if result.matched_count == 0:
            return None
        doc = self.collection.find_one({"case_code": case_code})
        return self._doc_to_dict(doc) if doc else None

    def delete_by_case_code(self, case_code: str) -> bool:
        result = self.collection.delete_one({"case_code": case_code})
        return result.deleted_count > 0

    def mark_delivered(
        self,
        case_codes: list[str],
        delivered_to: str,
        delivery_date: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        delivery = delivery_date or now
        result = self.collection.update_many(
            {"case_code": {"$in": case_codes}},
            {
                "$set": {
                    "delivered_to": delivered_to,
                    "delivery_date": delivery,
                    "status": "Completado",
                    "updated_at": now,
                }
            },
        )
        if result.modified_count == 0:
            return []
        cursor = self.collection.find({"case_code": {"$in": case_codes}})
        return [self._doc_to_dict(d) for d in cursor]
