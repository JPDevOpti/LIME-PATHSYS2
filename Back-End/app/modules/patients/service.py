from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Optional

from app.core.exceptions import conflict_exception, not_found_exception
from app.modules.patients.repository import PatientRepository
from app.modules.patients.schemas import PatientCreate, PatientUpdate
from app.security import get_password_hash

if TYPE_CHECKING:
    from app.modules.cases.repository import CaseRepository
    from app.modules.users.repository import UsersRepository


class PatientService:
    def __init__(
        self,
        repository: PatientRepository,
        case_repository: "CaseRepository | None" = None,
        users_repository: "UsersRepository | None" = None,
    ):
        self._repo = repository
        self._case_repo = case_repository
        self._users_repo = users_repository

    def list_patients(
        self,
        search: Optional[str] = None,
        created_at_from: Optional[str] = None,
        created_at_to: Optional[str] = None,
        entity: Optional[str] = None,
        care_type: Optional[str] = None,
        gender: Optional[str] = None,
        municipality_code: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> dict[str, Any]:
        data, total = self._repo.find_many(
            search=search,
            created_at_from=created_at_from,
            created_at_to=created_at_to,
            entity=entity,
            care_type=care_type,
            gender=gender,
            municipality_code=municipality_code,
            skip=skip,
            limit=limit,
        )
        return {"data": data, "total": total}

    def get_by_id(self, id: str) -> dict:
        patient = self._repo.find_by_id(id)
        if not patient:
            raise not_found_exception("Patient", id)
        return patient

    def create(self, data: PatientCreate, created_by_email: str | None = None) -> dict:
        payload = data.model_dump(exclude_none=True)
        for key, val in list(payload.items()):
            if isinstance(val, dict) and not val:
                del payload[key]
        created = self._repo.create(payload, created_by_email=created_by_email)
        self._create_patient_user(created, data.identification_number)
        return created

    def _create_patient_user(self, patient: dict, identification_number: str) -> None:
        if not self._users_repo:
            return
        patient_id = str(patient.get("id") or patient.get("_id") or "")

        # Vincular visitantes existentes con el mismo número de documento
        existing_users = self._users_repo.find_by_document(identification_number)
        for u in existing_users:
            if u.get("role") == "visitante" and not u.get("patient_id"):
                self._users_repo.set_patient_id(u["id"], patient_id)

        # Crear usuario paciente si no existe
        email = f"{identification_number}@paciente.dermapath.local"
        if self._users_repo.email_exists(email):
            return
        now = datetime.now(timezone.utc)
        user_doc = {
            "name": patient.get("full_name") or identification_number,
            "email": email,
            "password_hash": get_password_hash(identification_number),
            "role": "paciente",
            "document": identification_number,
            "patient_id": patient_id,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        self._users_repo.collection.insert_one(user_doc)

    def update(self, id: str, data: PatientUpdate, updated_by_email: str | None = None) -> dict:
        existing = self._repo.find_by_id(id)
        if not existing:
            raise not_found_exception("Patient", id)
        payload = data.model_dump(exclude_unset=True)
        for key, val in list(payload.items()):
            if isinstance(val, dict) and not val:
                del payload[key]
        result = self._repo.update(id, payload, updated_by_email=updated_by_email)
        if not result:
            raise not_found_exception("Patient", id)
        if self._case_repo:
            self._case_repo.update_patient_info_in_cases(id, result)
        return result

    def delete(self, id: str) -> None:
        existing = self._repo.find_by_id(id)
        if not existing:
            raise not_found_exception("Patient", id)
        self._repo.delete(id)
