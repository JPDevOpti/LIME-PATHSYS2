"""Repositorio de usuarios."""

import re
from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from pymongo.database import Database
from app.core.date_utils import format_iso_datetime


class UsersRepository:
    def __init__(self, db: Database) -> None:
        self.collection = db.get_collection("users")

    def _ensure_indexes(self) -> None:
        try:
            # Index para búsquedas y listados filtrados por rol y actividad, ordenados por nombre
            self.collection.create_index(
                [("role", 1), ("is_active", 1), ("name", 1)], 
                name="idx_role_active_name"
            )
            # Index para búsquedas por email.
            self.collection.create_index("email", unique=True, name="idx_user_email")
            
            # Índices para los códigos por rol
            self.collection.create_index("pathologist_code", name="idx_path_code")
            self.collection.create_index("resident_code", name="idx_res_code")
            self.collection.create_index("administrator_code", name="idx_admin_code")
            
            # Índice dedicado para el ordenamiento por nombre (crítico para la paginación)
            self.collection.create_index("name", name="idx_user_name_sort")
            
            # Nuevo índice para soportar la exclusión de pacientes y filtrado por nombre de forma eficiente
            self.collection.create_index([("role", 1), ("name", 1)], name="idx_role_name_perf")
        except Exception:
            pass

    def _doc_to_dict(self, doc: dict[str, Any]) -> dict[str, Any]:
        out: dict[str, Any] = {
            "id": str(doc.get("_id", "")),
            "name": doc.get("name", ""),
            "email": doc.get("email"),
            "role": doc.get("role", ""),
            "is_active": doc.get("is_active", True),
        }
        if "created_at" in doc:
            out["created_at"] = format_iso_datetime(doc.get("created_at"))
        if "updated_at" in doc:
            out["updated_at"] = format_iso_datetime(doc.get("updated_at"))
            
        code = (
            doc.get("administrator_code")
            or doc.get("pathologist_code")
            or doc.get("resident_code")
            or doc.get("billing_code")
            or doc.get("visitante_code")
            or doc.get("auxiliar_code")
        )
        if code or any(f in doc for f in ["administrator_code", "pathologist_code", "resident_code", "billing_code", "visitante_code", "auxiliar_code"]):
            out["code"] = code
            
        if "document" in doc: out["document"] = doc.get("document")
        if "initials" in doc: out["initials"] = doc.get("initials")
        if "medical_license" in doc: out["medical_license"] = doc.get("medical_license")
        if "observations" in doc: out["observations"] = doc.get("observations")
        if "signature" in doc: out["signature"] = doc.get("signature", "")
        elif "id" in out and "signature" not in doc:
            # Si no esta en el doc (por proyeccion), no lo incluimos o lo ponemos vacio
            # Pero UserResponse lo requiere segun el esquema si no es opcional
            # En schemas.py es Optional[str] = None, asi que podemos omitirlo
            pass
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
        include_signature: bool = True,
        fields: Optional[list[str]] = None,
        exclude_role: Optional[str] = None
    ) -> tuple[list[dict[str, Any]], int]:
        q: dict[str, Any] = {}
        if search and search.strip():
            s = re.escape(search.strip())
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
        
        # Filtro de inclusión de rol
        if role:
            if role == "pathologist":
                q["role"] = {"$in": ["pathologist", "patologo", "patólogo", "patóloga"]}
            elif role == "resident":
                q["role"] = {"$in": ["resident", "residente"]}
            elif role == "administrator":
                q["role"] = {"$in": ["administrator", "administrador", "admin"]}
            elif role == "auxiliar":
                q["role"] = {"$in": ["auxiliar", "recepcionista", "recepcion"]}
            elif role == "visitante":
                q["role"] = {"$in": ["visitante", "billing"]}
            else:
                q["role"] = role
        
        # Filtro de exclusión de rol
        if exclude_role:
            if exclude_role == "paciente":
                # OPTIMIZACIÓN CRÍTICA: En lugar de $nin (que escanea), usamos $in con los roles de personal.
                # Esto permite que MongoDB use el índice 'idx_role_name_perf' de forma mucho más eficiente.
                staff_roles = [
                    "administrator", "administrador", "admin",
                    "pathologist", "patologo", "patólogo", "patóloga",
                    "resident", "residente",
                    "auxiliar", "recepcionista", "recepcion",
                    "visitante", "billing"
                ]
                if "role" in q:
                    # Si ya había un filtro de rol, nos aseguramos de no incluir paciente
                    if isinstance(q["role"], dict) and "$in" in q["role"]:
                        q["role"]["$in"] = [r for r in q["role"]["$in"] if r not in ["paciente", "patient", "PACIENTE"]]
                    elif isinstance(q["role"], str) and q["role"] in ["paciente", "patient", "PACIENTE"]:
                        q["role"] = {"$in": []} # Conflicto: se pide paciente pero se excluye
                else:
                    q["role"] = {"$in": staff_roles}
            else:
                # Caso general para otros roles
                if "role" in q:
                    if isinstance(q["role"], dict):
                        q["role"].update({"$ne": exclude_role})
                    else:
                        q["role"] = {"$eq": q["role"], "$ne": exclude_role}
                else:
                    q["role"] = {"$ne": exclude_role}

        if is_active is True:
            # Optimización: si buscamos activos, preferimos { $ne: false } para incluir nulos 
            # pero si sabemos que todos tienen el campo, is_active: True es más rápido.
            # Por ahora mantenemos $ne: false por seguridad, pero limitamos campos.
            q["is_active"] = {"$ne": False}
        elif is_active is False:
            q["is_active"] = False

        if fields:
            projection = {f: 1 for f in fields}
            if "id" in projection:
                projection["_id"] = 1
                del projection["id"]
        else:
            projection = None if include_signature else {"signature": 0}

        total = self.collection.count_documents(q)
        cursor = self.collection.find(q, projection).sort("name", 1).skip(skip).limit(limit)
        data = [self._doc_to_dict(d) for d in cursor]
        return data, total

    def find_by_id(self, user_id: str, include_signature: bool = True) -> Optional[dict[str, Any]]:
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        projection = None if include_signature else {"signature": 0}
        doc = self.collection.find_one({"_id": oid}, projection)
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
        q: dict[str, Any] = {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}
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
