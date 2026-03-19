from datetime import date, datetime
from typing import Any, Optional

from fastapi import HTTPException

from app.core.exceptions import not_found_exception
from app.modules.cases.repository import CaseRepository
from app.modules.cases.schemas import CaseCreate, CaseTranscriptionUpdate, CaseUpdate
from app.modules.patients.repository import PatientRepository


class CaseService:
    def __init__(self, repository: CaseRepository, patient_repository: PatientRepository):
        self._repo = repository
        self._patient_repo = patient_repository

    def list_cases(
        self,
        search: Optional[str] = None,
        created_at_from: Optional[str] = None,
        created_at_to: Optional[str] = None,
        entity: Optional[str] = None,
        assigned_pathologist: Optional[str] = None,
        pathologist_name: Optional[str] = None,
        priority: Optional[str] = None,
        test: Optional[str] = None,
        state: Optional[str] = None,
        doctor: Optional[str] = None,
        patient_id: Optional[str] = None,
        identification_number: Optional[str] = None,
        opportunity: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
        skip: int = 0,
        limit: int = 50,
        current_user: Optional[dict] = None,
    ) -> dict[str, Any]:
        data, total = self._repo.find_many(
            search=search,
            created_at_from=created_at_from,
            created_at_to=created_at_to,
            entity=entity,
            assigned_pathologist=assigned_pathologist,
            pathologist_name=pathologist_name,
            priority=priority,
            test=test,
            state=state,
            doctor=doctor,
            patient_id=patient_id,
            identification_number=identification_number,
            opportunity=opportunity,
            sort_by=sort_by,
            sort_order=sort_order,
            skip=skip,
            limit=limit,
            current_user=current_user,
        )
        return {"data": data, "total": total}

    def get_by_id(self, id: str) -> dict:
        case = self._repo.find_by_id(id)
        if not case:
            raise not_found_exception("Case", id)
        return case

    def get_by_code(self, code: str) -> dict:
        case = self._repo.find_by_code(code)
        if not case:
            raise not_found_exception("Case", code)
        return case

    def create(self, data: CaseCreate, created_by_email: str | None = None, created_by_name: str | None = None, custom_case_code: str | None = None) -> dict:
        patient = self._patient_repo.find_by_id(data.patient_id)
        if not patient:
            raise not_found_exception("Patient", data.patient_id)
        
        # Paridad: si vienen en el caso, actualizar al paciente
        patient_updates = {}
        if data.entity and data.entity.name:
            patient_updates["entity_info.entity_name"] = data.entity.name
        if data.care_type:
            patient_updates["care_type"] = data.care_type
        
        if patient_updates:
            self._patient_repo.update(data.patient_id, patient_updates, updated_by_email=created_by_email)
            # Recargar paciente para el snapshot patient_info
            patient = self._patient_repo.find_by_id(data.patient_id)

        birth_date_raw = patient.get("birth_date")
        age_at_diagnosis = self._calculate_age(birth_date_raw)
        birth_date_str = self._normalize_birth_date(birth_date_raw)

        patient_info = {
            "patient_id": patient.get("id"),
            "patient_code": patient.get("patient_code", ""),
            "identification_type": patient.get("identification_type", ""),
            "identification_number": patient.get("identification_number", ""),
            "first_name": patient.get("first_name", ""),
            "second_name": patient.get("second_name"),
            "first_lastname": patient.get("first_lastname", ""),
            "second_lastname": patient.get("second_lastname"),
            "full_name": patient.get("full_name"),
            "birth_date": birth_date_str,
            "age_at_diagnosis": age_at_diagnosis,
            "gender": patient.get("gender", ""),
            "phone": patient.get("phone"),
            "email": patient.get("email"),
            "care_type": patient.get("care_type", ""),
            "entity_info": patient.get("entity_info"),
            "location": patient.get("location"),
            "observations": patient.get("observations"),
        }
        payload = data.model_dump(exclude_none=True, exclude={"patient_id"})
        for key, val in list(payload.items()):
            if isinstance(val, dict) and not val:
                del payload[key]
        return self._repo.create(payload, patient_info, created_by_email=created_by_email, created_by_name=created_by_name, custom_case_code=custom_case_code)

    def update(self, id: str, data: CaseUpdate, updated_by_email: str | None = None, updated_by_name: str | None = None) -> dict:
        existing = self._repo.find_by_id(id)
        if not existing:
            raise not_found_exception("Case", id)

        payload = data.model_dump(exclude_unset=True)
        for key, val in list(payload.items()):
            if isinstance(val, dict) and not val:
                del payload[key]
        
        # Paridad: si vienen en el caso, actualizar al paciente real
        patient_updates = {}
        if "entity" in payload:
            entity_val = payload["entity"]
            entity_name = entity_val.get("name") if isinstance(entity_val, dict) else entity_val
            if entity_name:
                payload["patient_info.entity_info.entity_name"] = entity_name
                patient_updates["entity_info.entity_name"] = entity_name
        if "care_type" in payload:
            care_val = payload.pop("care_type")
            payload["patient_info.care_type"] = care_val
            patient_updates["care_type"] = care_val
        
        if patient_updates and "patient_info" in existing:
            p_id = existing["patient_info"].get("patient_id")
            if p_id:
                self._patient_repo.update(str(p_id), patient_updates, updated_by_email=updated_by_email)

        already_delivered = any(
            e.get("action") == "delivered"
            for e in (existing.get("audit_info") or [])
        )
        is_delivery = payload.get("state") == "Completado" and not already_delivered
        audit_action = "delivered" if is_delivery else "edited"
        result = self._repo.update(id, payload, updated_by_email=updated_by_email, updated_by_name=updated_by_name, audit_action=audit_action)
        if not result:
            raise not_found_exception("Case", id)
        return result

    def delete(self, id: str) -> None:
        existing = self._repo.find_by_id(id)
        if not existing:
            raise not_found_exception("Case", id)
        if not self._repo.delete(id):
            raise not_found_exception("Case", id)

    def add_note(self, id: str, text: str, date: str) -> dict:
        result = self._repo.add_note(id, text, date)
        if result is None:
            raise not_found_exception("Case", id)
        return result

    def delete_note(self, id: str, note_index: int) -> dict:
        result = self._repo.delete_note(id, note_index)
        if result is None:
            raise not_found_exception("Case", id)
        return result

    @staticmethod
    def _normalize_birth_date(birth_date_raw: Any) -> str | None:
        """Devuelve birth_date como string YYYY-MM-DD o None."""
        if birth_date_raw is None:
            return None
        if isinstance(birth_date_raw, datetime):
            return birth_date_raw.strftime("%Y-%m-%d")
        if isinstance(birth_date_raw, date):
            return birth_date_raw.strftime("%Y-%m-%d")
        raw = str(birth_date_raw).strip()
        return raw[:10] if raw else None

    @staticmethod
    def _calculate_age(birth_date_raw: Any) -> int | None:
        """Calcula edad en años completos a partir de la fecha de nacimiento."""
        try:
            if isinstance(birth_date_raw, datetime):
                birth = birth_date_raw.date()
            elif isinstance(birth_date_raw, date):
                birth = birth_date_raw
            elif isinstance(birth_date_raw, str) and birth_date_raw.strip():
                birth = date.fromisoformat(str(birth_date_raw).strip()[:10])
            else:
                return None
            today = date.today()
            return (today.year - birth.year
                    - ((today.month, today.day) < (birth.month, birth.day)))
        except Exception:
            return None

    def _compute_transcription_state(self, result: dict) -> str | None:
        """Calcula nuevo estado segun completitud del resultado."""
        methods = result.get("method") or []
        has_method = bool(methods and any(m and str(m).strip() for m in methods))
        has_macro = bool((result.get("macro_result") or "").strip())
        has_micro = bool((result.get("micro_result") or "").strip())
        has_diagnosis = bool((result.get("diagnosis") or "").strip())
        if has_method and has_macro and has_micro and has_diagnosis:
            return "Por firmar"
        if has_method and has_macro and has_micro:
            return "Descrip micro"
        if has_method and has_macro:
            return "Corte macro"
        return None

    def update_transcription(
        self, id: str, data: CaseTranscriptionUpdate, updated_by_email: str | None = None, updated_by_name: str | None = None, skip_state_update: bool = False
    ) -> dict:
        existing = self._repo.find_by_id(id)
        if not existing:
            raise not_found_exception("Case", id)
        payload = data.model_dump(exclude_none=True)
        samples = payload.pop("samples", None)
        existing_result = existing.get("result") or {}
        merged = {**existing_result, **payload}
        new_state = None if skip_state_update else self._compute_transcription_state(merged)
        result = self._repo.update_transcription(
            id, merged, new_state, updated_by_email=updated_by_email, updated_by_name=updated_by_name, audit_action="transcribed", samples=samples
        )
        if not result:
            raise not_found_exception("Case", id)
        return result

    def sign_case(
        self,
        id: str,
        data: CaseTranscriptionUpdate,
        user_id: str,
        current_user: dict,
        updated_by_email: str | None = None,
        updated_by_name: str | None = None,
    ) -> dict:
        """Actualiza resultado y pasa el caso a Por entregar. Solo admin o patologo asignado."""
        existing = self._repo.find_by_id(id)
        if not existing:
            raise not_found_exception("Case", id)
        role = str(current_user.get("role", "")).lower()
        is_admin = role in ("administrator", "administrador")
        assigned = existing.get("assigned_pathologist") or {}
        pathologist_id = str(assigned.get("id", "")).strip() if assigned else ""
        is_assigned_pathologist = pathologist_id and str(user_id) == pathologist_id
        
        # Verificar si es patologo asistente (ellos no pueden firmar)
        assistants = existing.get("assistant_pathologists") or []
        assistant_ids = [str(a.get("id", "")) for a in assistants]
        is_assistant = str(user_id) in assistant_ids

        if is_assistant:
            raise HTTPException(
                status_code=403,
                detail="Como patólogo asistente, puede visualizar pero no tiene permiso para firmar este caso",
            )

        if not is_admin:
            signer_signature = str(current_user.get("signature", "") or "").strip()
            if not signer_signature:
                raise HTTPException(
                    status_code=403,
                    detail="No puede firmar este caso porque no tiene una firma registrada. Por favor suba su firma en su perfil.",
                )

        if not is_admin and not is_assigned_pathologist:
            raise HTTPException(
                status_code=403,
                detail="Solo el administrador o el patologo asignado pueden firmar este caso",
            )
        payload = data.model_dump(exclude_none=True)
        samples = payload.pop("samples", None)
        complementary_tests = payload.pop("complementary_tests", None)
        complementary_tests_reason = payload.pop("complementary_tests_reason", None)
        existing_result = existing.get("result") or {}
        merged = {**existing_result, **payload}
        approval_state = "request_made" if complementary_tests and len(complementary_tests) > 0 else None
        result = self._repo.update_transcription(
            id,
            merged,
            "Por entregar",
            updated_by_email=updated_by_email,
            updated_by_name=updated_by_name,
            complementary_tests=complementary_tests,
            complementary_tests_reason=complementary_tests_reason,
            approval_state=approval_state,
            audit_action="signed",
            samples=samples,
        )
        if not result:
            raise not_found_exception("Case", id)
        return result
