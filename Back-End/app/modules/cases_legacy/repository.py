import copy
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
from pymongo.database import Database


def _doc_to_legacy_case(doc: dict) -> dict:
    if not doc:
        return {}
    out = copy.deepcopy(doc)
    out["id"] = str(out["_id"])
    del out["_id"]
    return out


class LegacyCaseRepository:
    def __init__(self, db: Database):
        self.collection = db["cases_legacy"]

    def _ensure_indexes(self):
        self.collection.create_index([("legacy_id", ASCENDING)], unique=True)
        self.collection.create_index([("patient.identification", ASCENDING)])
        self.collection.create_index([("patient.full_name", ASCENDING)])
        self.collection.create_index([("entity", ASCENDING)])
        self.collection.create_index([("received_at", ASCENDING)])
        self.collection.create_index([("closed_at", ASCENDING)])

    def _build_query(
        self,
        search: Optional[str],
        entity: Optional[str],
        received_from: Optional[str],
        received_to: Optional[str],
    ) -> dict:
        query: dict = {}

        if search:
            s = search.strip()
            query["$or"] = [
                {"legacy_id": {"$regex": s, "$options": "i"}},
                {"patient.full_name": {"$regex": s, "$options": "i"}},
                {"patient.identification": {"$regex": s, "$options": "i"}},
            ]

        if entity:
            query["entity"] = {"$regex": f"^{entity}$", "$options": "i"}

        date_filter: dict = {}
        if received_from:
            try:
                dt = datetime.fromisoformat(received_from.replace("Z", "+00:00"))
                date_filter["$gte"] = dt
            except ValueError:
                pass
        if received_to:
            try:
                dt = datetime.fromisoformat(received_to.replace("Z", "+00:00"))
                date_filter["$lte"] = dt
            except ValueError:
                pass
        if date_filter:
            query["received_at"] = date_filter

        return query

    def find_many(
        self,
        search: Optional[str] = None,
        entity: Optional[str] = None,
        received_from: Optional[str] = None,
        received_to: Optional[str] = None,
        skip: int = 0,
        limit: int = 25,
    ) -> tuple[list[dict], int]:
        query = self._build_query(search, entity, received_from, received_to)
        total = self.collection.count_documents(query)
        cursor = (
            self.collection.find(query)
            .sort("received_at", DESCENDING)
            .skip(skip)
            .limit(limit)
        )
        docs = [_doc_to_legacy_case(d) for d in cursor]
        return docs, total

    def find_by_id(self, case_id: str) -> Optional[dict]:
        try:
            oid = ObjectId(case_id)
        except Exception:
            return None
        doc = self.collection.find_one({"_id": oid})
        return _doc_to_legacy_case(doc) if doc else None

    def get_available_entities(self) -> list[str]:
        raw = self.collection.distinct("entity")
        return sorted([r for r in raw if r and isinstance(r, str)])
