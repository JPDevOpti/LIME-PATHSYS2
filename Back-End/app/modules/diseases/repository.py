"""Repositorio de enfermedades (CIE-10, CIE-O)."""

from typing import Any, Optional

from bson import ObjectId
from pymongo.database import Database


class DiseasesRepository:
    def __init__(self, db: Database) -> None:
        self.collection = db.get_collection("diseases")

    def _doc_to_dict(self, doc: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": str(doc.get("_id", "")),
            "table": doc.get("table", ""),
            "code": doc.get("code", ""),
            "name": doc.get("name", ""),
            "description": doc.get("description"),
            "is_active": doc.get("is_active", True),
        }

    def search(
        self,
        query: str,
        table: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        q: dict[str, Any] = {
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"code": {"$regex": query, "$options": "i"}},
            ],
            "is_active": True,
        }
        if table and table.strip():
            q["table"] = table.strip()
        cursor = self.collection.find(q).skip(skip).limit(limit)
        return [self._doc_to_dict(d) for d in cursor]

    def get_by_code(self, code: str) -> Optional[dict[str, Any]]:
        doc = self.collection.find_one({"code": code, "is_active": True})
        if not doc:
            return None
        return self._doc_to_dict(doc)

    def get_by_table(
        self,
        table: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        cursor = self.collection.find(
            {"table": table, "is_active": True}
        ).skip(skip).limit(limit)
        return [self._doc_to_dict(d) for d in cursor]

    def create(self, data: dict[str, Any]) -> dict[str, Any]:
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc).isoformat()
        data["created_at"] = now
        data["updated_at"] = now
        result = self.collection.insert_one(data)
        data["_id"] = result.inserted_id
        return self._doc_to_dict(data)
