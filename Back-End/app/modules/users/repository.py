"""Repositorio de usuarios."""

from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from pymongo.database import Database
from app.core.date_utils import format_iso_datetime


class UsersRepository:
    def __init__(self, db: Database) -> None:
        self.collection = db.get_collection("users")

    def _doc_to_dict(self, doc: dict[str, Any]) -> dict[str, Any]:
        out: dict[str, Any] = {
            "id": str(doc.get("_id", "")),
            "name": doc.get("name", ""),
            "email": doc.get("email"),
            "role": doc.get("role", ""),
            "is_active": doc.get("is_active", True),
            "created_at": format_iso_datetime(doc.get("created_at")),
            "updated_at": format_iso_datetime(doc.get("updated_at")),
        }
        code = (
            doc.get("administrator_code")
            or doc.get("pathologist_code")
            or doc.get("resident_code")
            or doc.get("billing_code")
            or doc.get("visitante_code")
            or doc.get("auxiliar_code")
        )
        out["code"] = code
        out["document"] = doc.get("document")
        out["initials"] = doc.get("initials")
        out["medical_license"] = doc.get("medical_license")
        out["observations"] = doc.get("observations")
        out["signature"] = doc.get("signature", "")
        return out

    def _role_code_field(self, role: str) -> str:
        mapping = {
            "administrator": "administrator_code",
            "pathologist": "pathologist_code",
            "resident": "resident_code",
            "visitante": "visitante_code",
            "billing": "billing_code",
            "auxiliar": "auxiliar_code",
        }
        return mapping.get(role, "code")

    def find_many(
        self,
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[dict[str, Any]], int]:
        q: dict[str, Any] = {}
        if search and search.strip():
            s = search.strip()
            q["$or"] = [
                {"name": {"$regex": s, "$options": "i"}},
                {"email": {"$regex": s, "$options": "i"}},
                {"administrator_code": {"$regex": s, "$options": "i"}},
                {"pathologist_code": {"$regex": s, "$options": "i"}},
                {"resident_code": {"$regex": s, "$options": "i"}},
                {"billing_code": {"$regex": s, "$options": "i"}},
                {"visitante_code": {"$regex": s, "$options": "i"}},
                {"auxiliar_code": {"$regex": s, "$options": "i"}},
            ]
        if role:
            if role == "visitante":
                q["role"] = {"$in": ["visitante", "billing"]}
            else:
                q["role"] = role
        if is_active is not None:
            q["is_active"] = is_active

        total = self.collection.count_documents(q)
        cursor = self.collection.find(q).sort("name", 1).skip(skip).limit(limit)
        data = [self._doc_to_dict(d) for d in cursor]
        return data, total

    def find_by_id(self, user_id: str) -> Optional[dict[str, Any]]:
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        doc = self.collection.find_one({"_id": oid})
        if not doc:
            return None
        return self._doc_to_dict(doc)

    def find_by_document(self, document: str) -> list[dict[str, Any]]:
        """Retorna todos los usuarios con ese número de documento."""
        docs = self.collection.find({"document": document})
        return [self._doc_to_dict(d) for d in docs]

    def set_patient_id(self, user_id: str, patient_id: str) -> None:
        """Asigna patient_id a un usuario por su _id."""
        try:
            oid = ObjectId(user_id)
        except Exception:
            return
        self.collection.update_one({"_id": oid}, {"$set": {"patient_id": patient_id}})

    def email_exists(self, email: str, exclude_id: Optional[str] = None) -> bool:
        q: dict[str, Any] = {"email": {"$regex": f"^{email}$", "$options": "i"}}
        if exclude_id:
            try:
                q["_id"] = {"$ne": ObjectId(exclude_id)}
            except Exception:
                pass
        return self.collection.find_one(q) is not None

    def code_exists_for_role(self, role: str, code: str, exclude_id: Optional[str] = None) -> bool:
        field = self._role_code_field(role)
        q: dict[str, Any] = {field: code}
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
        result = self.collection.insert_one(data)
        doc = self.collection.find_one({"_id": result.inserted_id})
        return self._doc_to_dict(doc) if doc else {}

    def update(self, user_id: str, data: dict[str, Any]) -> Optional[dict[str, Any]]:
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = self.collection.update_one({"_id": oid}, {"$set": data})
        if result.modified_count == 0 and result.matched_count == 0:
            return None
        doc = self.collection.find_one({"_id": oid})
        return self._doc_to_dict(doc) if doc else None
