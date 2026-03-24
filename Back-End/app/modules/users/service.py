"""Servicio de usuarios (perfiles)."""

from typing import TYPE_CHECKING, Any, Optional

from app.core.exceptions import conflict_exception, not_found_exception
from app.modules.users.repository import UsersRepository
from app.modules.users.schemas import UserCreate, UserUpdate
from app.security import get_password_hash

if TYPE_CHECKING:
    from app.modules.patients.repository import PatientRepository


class UsersService:
    def __init__(self, repo: UsersRepository, patient_repo: "PatientRepository | None" = None) -> None:
        self._repo = repo
        self._patient_repo = patient_repo

    def _build_user_doc(self, data: UserCreate) -> dict[str, Any]:
        role = data.role
        code_field = self._repo._role_code_field(role)
        doc: dict[str, Any] = {
            "name": data.name.strip(),
            "email": data.email.strip().lower(),
            "password_hash": get_password_hash(data.password),
            "role": role,
            "is_active": data.is_active,
        }
        if data.code and data.code.strip():
            doc[code_field] = data.code.strip()
        if data.document and data.document.strip():
            doc["document"] = data.document.strip()
        if data.initials and data.initials.strip():
            doc["initials"] = data.initials.strip()
        if data.medical_license and data.medical_license.strip():
            doc["medical_license"] = data.medical_license.strip()
        if data.observations is not None:
            doc["observations"] = data.observations.strip() or None
        return doc

    def list_users(
        self,
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
        include_signature: bool = True,
        fields: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        data, total = self._repo.find_many(
            search=search, 
            role=role, 
            is_active=is_active, 
            skip=skip, 
            limit=limit,
            include_signature=include_signature,
            fields=fields
        )
        return {"data": data, "total": total}

    def get_by_id(self, user_id: str) -> dict[str, Any]:
        user = self._repo.find_by_id(user_id)
        if not user:
            raise not_found_exception("User", user_id)
        return user

    def _resolve_patient_id_for_visitante(self, document: str) -> Optional[str]:
        """Busca el patient_id del paciente con ese número de documento."""
        if not self._patient_repo or not document:
            return None
        result, _ = self._patient_repo.find_many(search=document, limit=5)
        for p in result:
            pid = p.get("id") or p.get("_id")
            doc_field = p.get("identification_number", "")
            if str(doc_field).strip() == document.strip() and pid:
                return str(pid)
        return None

    def create(self, data: UserCreate) -> dict[str, Any]:
        if self._repo.email_exists(data.email):
            raise conflict_exception("El correo ya esta registrado")
        if data.code and data.code.strip():
            if self._repo.code_exists_for_role(data.role, data.code.strip()):
                raise conflict_exception("El codigo ya existe para este tipo de perfil")
        doc = self._build_user_doc(data)
        if data.role == "visitante" and data.document and data.document.strip():
            pid = self._resolve_patient_id_for_visitante(data.document.strip())
            if pid:
                doc["patient_id"] = pid
        return self._repo.create(doc)

    def update(self, user_id: str, data: UserUpdate) -> dict[str, Any]:
        existing = self._repo.find_by_id(user_id)
        if not existing:
            raise not_found_exception("User", user_id)

        payload = data.model_dump(exclude_none=True)
        if "password" in payload:
            payload["password_hash"] = get_password_hash(payload.pop("password"))

        if "email" in payload:
            email = str(payload["email"]).strip().lower()
            if self._repo.email_exists(email, exclude_id=user_id):
                raise conflict_exception("El correo ya esta registrado")
            payload["email"] = email

        role = payload.get("role") or existing.get("role")
        code = payload.pop("code", None)
        if code is not None and str(code).strip():
            if self._repo.code_exists_for_role(role, str(code).strip(), exclude_id=user_id):
                raise conflict_exception("El codigo ya existe para este tipo de perfil")
            code_field = self._repo._role_code_field(role)
            payload[code_field] = str(code).strip()

        if "medical_license" in payload and payload["medical_license"] is not None:
            payload["medical_license"] = str(payload["medical_license"]).strip() or None

        # Si es visitante y se actualiza el documento, vincular patient_id
        effective_role = role
        if effective_role == "visitante" and "document" in payload and payload["document"]:
            pid = self._resolve_patient_id_for_visitante(str(payload["document"]).strip())
            if pid:
                payload["patient_id"] = pid

        result = self._repo.update(user_id, payload)
        if not result:
            raise not_found_exception("User", user_id)
        return result
