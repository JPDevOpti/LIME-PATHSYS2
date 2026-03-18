"""Repositorio de pruebas."""

import re
from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from pymongo.database import Database
from app.core.date_utils import format_iso_datetime


class TestsRepository:
    def __init__(self, db: Database) -> None:
        self._db = db
        self.collection = db.get_collection("tests")

    def _ensure_indexes(self) -> None:
        self.collection.create_index("test_code", unique=True)

    def _doc_to_dict(self, doc: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": str(doc.get("_id", "")),
            "name": doc.get("name", ""),
            "test_code": doc.get("test_code", ""),
            "description": doc.get("description"),
            "time": doc.get("time", 1),
            "price": doc.get("price", 0),
            "is_active": doc.get("is_active", True),
            "agreements": doc.get("agreements", []),
            "created_at": format_iso_datetime(doc.get("created_at")),
            "updated_at": format_iso_datetime(doc.get("updated_at")),
        }

    def find_many(
        self,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[dict[str, Any]], int]:
        q: dict[str, Any] = {}
        if search and search.strip():
            s = re.escape(search.strip())
            q["$or"] = [
                {"name": {"$regex": s, "$options": "i"}},
                {"test_code": {"$regex": s, "$options": "i"}},
                {"description": {"$regex": s, "$options": "i"}},
            ]
        if is_active is not None:
            q["is_active"] = is_active

        total = self.collection.count_documents(q)
        cursor = self.collection.find(q).sort("name", 1).skip(skip).limit(limit)
        data = [self._doc_to_dict(d) for d in cursor]
        return data, total

    def find_by_code(self, code: str) -> Optional[dict[str, Any]]:
        normalized = code.strip().upper()
        doc = self.collection.find_one({"test_code": normalized})
        if not doc:
            return None
        return self._doc_to_dict(doc)

    def code_exists(self, code: str, exclude_id: Optional[str] = None) -> bool:
        normalized = code.strip().upper()
        q: dict[str, Any] = {"test_code": normalized}
        if exclude_id:
            try:
                q["_id"] = {"$ne": ObjectId(exclude_id)}
            except Exception:
                pass
        return self.collection.find_one(q) is not None

    def create(self, data: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        data["created_at"] = now
        data["updated_at"] = now
        data["test_code"] = data.get("test_code", "").strip().upper()
        result = self.collection.insert_one(data)
        doc = self.collection.find_one({"_id": result.inserted_id})
        return self._doc_to_dict(doc) if doc else {}

    def update_by_code(self, code: str, data: dict[str, Any]) -> Optional[dict[str, Any]]:
        normalized = code.strip().upper()
        new_code = data.get("test_code", normalized)
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = self.collection.update_one({"test_code": normalized}, {"$set": data})
        if result.matched_count == 0:
            return None
        doc = self.collection.find_one({"test_code": new_code})
        return self._doc_to_dict(doc) if doc else None

    def propagate_to_cases(self, test_id: str, updates: dict[str, str]) -> int:
        """Propaga cambios de test_code y/o name a todos los casos que referencian esta prueba."""
        cases_col = self._db.get_collection("cases")
        try:
            oid = ObjectId(test_id)
        except Exception:
            return 0

        set_fields: dict[str, Any] = {}
        if "test_code" in updates:
            set_fields["samples.$[].tests.$[t].test_code"] = updates["test_code"]
        if "name" in updates:
            set_fields["samples.$[].tests.$[t].name"] = updates["name"]

        if not set_fields:
            return 0

        result = cases_col.update_many(
            {"samples.tests.id": str(oid)},
            {"$set": set_fields},
            array_filters=[{"t.id": str(oid)}],
        )
        return result.modified_count
