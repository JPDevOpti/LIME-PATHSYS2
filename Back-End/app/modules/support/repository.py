from datetime import datetime
from typing import Any, Optional
from app.core.date_utils import format_iso_datetime

from bson import ObjectId
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.cursor import Cursor


def _doc_to_ticket(doc: dict) -> dict:
    """Convierte documento MongoDB a formato API (id string, fechas ISO)."""
    if not doc:
        return {}
    out = dict(doc)
    out["id"] = str(doc["_id"])
    del out["_id"]
    
    for key in ("ticket_date", "created_at", "updated_at"):
        if key in out and isinstance(out[key], datetime):
            out[key] = format_iso_datetime(out[key])
            
    if "comments" in out and isinstance(out["comments"], list):
        for comment in out["comments"]:
            if "created_at" in comment and isinstance(comment["created_at"], datetime):
                comment["created_at"] = format_iso_datetime(comment["created_at"])
                
    return out


class SupportRepository:
    COLLECTION = "support_tickets"
    COUNTERS_COLLECTION = "counters"
    TICKET_SEQ_KEY = "ticket_seq"

    def __init__(self, db: Database):
        self._coll: Collection = db[self.COLLECTION]
        self._counters: Collection = db[self.COUNTERS_COLLECTION]

    def _get_next_seq(self) -> int:
        result = self._counters.find_one_and_update(
            {"_id": self.TICKET_SEQ_KEY},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        return result.get("seq", 1)

    def _ensure_indexes(self) -> None:
        self._coll.create_index("ticket_code", unique=True)
        self._coll.create_index("status")
        self._coll.create_index("ticket_date")

    def find_many(
        self,
        status: Optional[str] = None,
        category: Optional[str] = None,
        search_text: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
        sort_by: str = "ticket_date",
        sort_order: str = "desc"
    ) -> tuple[list[dict], int]:
        query: dict[str, Any] = {}

        if status:
            query["status"] = status
        if category:
            query["category"] = category
        if search_text:
            query["$or"] = [
                {"title": {"$regex": search_text, "$options": "i"}},
                {"description": {"$regex": search_text, "$options": "i"}},
                {"ticket_code": {"$regex": search_text, "$options": "i"}}
            ]

        total = self._coll.count_documents(query)
        
        direction = -1 if sort_order == "desc" else 1
        cursor: Cursor = self._coll.find(query).skip(skip).limit(limit).sort(sort_by, direction)
        
        data = [_doc_to_ticket(d) for d in cursor]
        return data, total

    def find_by_code(self, code: str) -> Optional[dict]:
        doc = self._coll.find_one({"ticket_code": code})
        return _doc_to_ticket(doc) if doc else None

    def create(self, data: dict, user_id: str, user_name: str) -> dict:
        seq = self._get_next_seq()
        year = datetime.utcnow().year
        data["ticket_code"] = f"T-{year}-{seq:03d}"
        
        now = datetime.utcnow()
        data["ticket_date"] = now
        data["created_at"] = now
        data["updated_at"] = now
        data["status"] = "open"
        data["created_by"] = user_id
        data["created_by_name"] = user_name
        data["comments"] = []

        result = self._coll.insert_one(data)
        doc = self._coll.find_one({"_id": result.inserted_id})
        return _doc_to_ticket(doc)

    def update_status(self, code: str, status: str) -> Optional[dict]:
        now = datetime.utcnow()
        result = self._coll.update_one(
            {"ticket_code": code},
            {"$set": {"status": status, "updated_at": now}}
        )
        if result.matched_count == 0:
            return None
        return self.find_by_code(code)

    def add_comment(self, code: str, comment_data: dict) -> Optional[dict]:
        now = datetime.utcnow()
        comment_data["id"] = str(ObjectId())
        comment_data["created_at"] = now
        
        result = self._coll.update_one(
            {"ticket_code": code},
            {
                "$push": {"comments": comment_data},
                "$set": {"updated_at": now}
            }
        )
        if result.matched_count == 0:
            return None
        return self.find_by_code(code)

    def delete(self, code: str) -> bool:
        result = self._coll.delete_one({"ticket_code": code})
        return result.deleted_count > 0
