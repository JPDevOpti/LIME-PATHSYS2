"""Repositorio de entidades."""

import re
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from pymongo.database import Database
from app.core.date_utils import format_iso_datetime


class EntitiesRepository:
    def __init__(self, db: Database) -> None:
        self._db = db
        self.collection = db.get_collection("entities")

    def _ensure_indexes(self) -> None:
        self.collection.create_index("code", unique=True)

    def _doc_to_dict(self, doc: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": str(doc.get("_id", "")),
            "name": doc.get("name", ""),
            "code": doc.get("code", ""),
            "observations": doc.get("observations"),
            "is_active": doc.get("is_active", True),
            "created_at": format_iso_datetime(doc.get("created_at")),
            "updated_at": format_iso_datetime(doc.get("updated_at")),
        }

    def find_many(
        self,
        search: str | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[dict[str, Any]], int]:
        q: dict[str, Any] = {}
        if search and search.strip():
            s = re.escape(search.strip())
            q["$or"] = [
                {"name": {"$regex": s, "$options": "i"}},
                {"code": {"$regex": s, "$options": "i"}},
            ]
        if is_active is not None:
            q["is_active"] = is_active

        total = self.collection.count_documents(q)
        cursor = self.collection.find(q).sort("name", 1).skip(skip).limit(limit)
        data = [self._doc_to_dict(d) for d in cursor]
        return data, total

    def find_by_code(self, code: str) -> dict[str, Any] | None:
        normalized = code.strip().upper()
        doc = self.collection.find_one({"code": normalized})
        if not doc:
            return None
        return self._doc_to_dict(doc)

    def code_exists(self, code: str, exclude_id: str | None = None) -> bool:
        normalized = code.strip().upper()
        q: dict[str, Any] = {"code": normalized}
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
        data["code"] = data.get("code", "").strip().upper()
        result = self.collection.insert_one(data)
        doc = self.collection.find_one({"_id": result.inserted_id})
        return self._doc_to_dict(doc) if doc else {}

    def update_by_code(self, code: str, data: dict[str, Any]) -> dict[str, Any] | None:
        normalized = code.strip().upper()
        new_code = data.get("code", normalized)
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = self.collection.update_one({"code": normalized}, {"$set": data})
        if result.matched_count == 0:
            return None
        doc = self.collection.find_one({"code": new_code})
        return self._doc_to_dict(doc) if doc else None

    def propagate_to_cases(self, entity_id: str, updates: dict[str, str]) -> int:
        """Propaga cambios de name a todos los casos que referencian esta entidad."""
        cases_col = self._db.get_collection("cases")

        set_fields: dict[str, Any] = {}
        if "name" in updates:
            set_fields["entity.name"] = updates["name"]

        if not set_fields:
            return 0

        result = cases_col.update_many(
            {"entity.id": entity_id},
            {"$set": set_fields},
        )
        return result.modified_count
