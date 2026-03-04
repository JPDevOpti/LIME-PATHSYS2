"""Repositorio de usuarios para autenticación."""

from typing import Any, Optional

from bson import ObjectId
from pymongo.database import Database


class AuthRepository:
    def __init__(self, db: Database) -> None:
        self.db = db
        self.collection = db.get_collection("users")

    def get_user_by_email(self, email: str) -> Optional[dict[str, Any]]:
        doc = self.collection.find_one(
            {"email": {"$regex": f"^{email}$", "$options": "i"}, "is_active": True}
        )
        if not doc:
            return None
        doc["_id"] = str(doc.get("_id", ""))
        if doc.get("role") == "billing" and not doc.get("associated_entities"):
            try:
                bc = doc.get("billing_code")
                if bc:
                    bd = self.db.get_collection("billing").find_one({"billing_code": bc})
                    if bd and bd.get("associated_entities"):
                        doc["associated_entities"] = bd["associated_entities"]
            except Exception:
                pass
        return doc

    def get_user_by_id(self, user_id: str) -> Optional[dict[str, Any]]:
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        doc = self.collection.find_one({"_id": oid, "is_active": True})
        if not doc:
            return None
        doc["_id"] = str(doc.get("_id", ""))
        if doc.get("role") == "billing" and not doc.get("associated_entities"):
            try:
                bc = doc.get("billing_code")
                if bc:
                    bd = self.db.get_collection("billing").find_one({"billing_code": bc})
                    if bd and bd.get("associated_entities"):
                        doc["associated_entities"] = bd["associated_entities"]
            except Exception:
                pass
        return doc
