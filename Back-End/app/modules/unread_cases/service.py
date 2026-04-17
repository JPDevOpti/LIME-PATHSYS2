"""Servicio de casos sin lectura."""

from typing import Any, Optional

from app.core.exceptions import conflict_exception, not_found_exception
from app.modules.unread_cases.repository import UnreadCasesRepository
from app.modules.unread_cases.schemas import (
    BulkMarkDeliveredPayload,
    TestGroupSchema,
    UnreadCaseCreate,
    UnreadCaseUpdate,
)


class UnreadCasesService:
    def __init__(self, repo: UnreadCasesRepository) -> None:
        self._repo = repo

    def list_cases(
        self,
        search: Optional[str] = None,
        institution: Optional[str] = None,
        test_type: Optional[str] = None,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> dict[str, Any]:
        type_map = {
            "low_complexity": "LOW_COMPLEXITY_IHQ",
            "high_complexity": "HIGH_COMPLEXITY_IHQ",
            "special": "SPECIAL_IHQ",
            "histochemistry": "HISTOCHEMISTRY",
        }
        mapped_type = type_map.get(test_type, test_type) if test_type else None
        data, total = self._repo.find_many(
            search=search,
            institution=institution,
            test_type=mapped_type,
            status=status,
            date_from=date_from,
            date_to=date_to,
            skip=skip,
            limit=limit,
        )
        return {"data": data, "total": total}

    def get_by_case_code(self, case_code: str) -> dict[str, Any]:
        case = self._repo.find_by_case_code(case_code)
        if not case:
            raise not_found_exception("Unread case", case_code)
        return case

    def _generate_case_code(self) -> str:
        from datetime import datetime

        from app.core.date_utils import COLOMBIA_TZ

        year = datetime.now(COLOMBIA_TZ).year
        seq = self._repo._get_next_sequence_for_year(year)
        return f"UR{year}-{str(seq).zfill(5)}"

    def create(self, data: UnreadCaseCreate) -> dict[str, Any]:
        case_code = data.case_code or self._generate_case_code()
        payload = {
            "case_code": case_code,
            "is_special_case": data.is_special_case if data.is_special_case is not None else False,
            "external_case_number": data.external_case_number,
            "document_type": data.document_type,
            "patient_document": data.patient_document,
            "patient_name": data.patient_name,
            "entity_code": data.entity_code,
            "entity_name": data.entity_name,
            "institution": data.institution,
            "notes": data.notes,
            "number_of_plates": data.number_of_plates if data.number_of_plates is not None else 1,
            "entry_date": data.entry_date,
            "received_by": data.received_by,
            "status": data.status or "En proceso",
        }
        if data.test_groups:
            payload["test_groups"] = []
            for g in data.test_groups:
                if not g:
                    continue
                tests = [t for t in (g.tests or []) if t and t.code and (t.quantity or 1) > 0]
                if g.type or tests:
                    payload["test_groups"].append({
                        "type": g.type,
                        "tests": [{"code": t.code, "quantity": t.quantity or 1, "name": t.name} for t in tests],
                        "observations": g.observations,
                    })
        return self._repo.create(payload)

    def update(self, case_code: str, data: UnreadCaseUpdate, updated_by: str | None = None) -> dict[str, Any]:
        existing = self._repo.find_by_case_code(case_code)
        if not existing:
            raise not_found_exception("Unread case", case_code)
        payload = data.model_dump(exclude_none=True)
        if updated_by is not None:
            payload["updated_by"] = updated_by
        if data.test_groups:
            payload["test_groups"] = []
            for g in data.test_groups:
                if not g:
                    continue
                tests = [{"code": t.code, "quantity": t.quantity or 1, "name": t.name} for t in (g.tests or []) if t and t.code]
                payload["test_groups"].append({
                    "type": g.type,
                    "tests": tests,
                    "observations": g.observations,
                })
        result = self._repo.update_by_case_code(case_code, payload)
        if not result:
            raise not_found_exception("Unread case", case_code)
        return result

    def delete(self, case_code: str) -> None:
        existing = self._repo.find_by_case_code(case_code)
        if not existing:
            raise not_found_exception("Unread case", case_code)
        if not self._repo.delete_by_case_code(case_code):
            raise not_found_exception("Unread case", case_code)

    def mark_delivered(self, payload: BulkMarkDeliveredPayload) -> list[dict[str, Any]]:
        return self._repo.mark_delivered(
            case_codes=payload.case_codes,
            delivered_to=payload.delivered_to,
            delivery_date=payload.delivery_date,
        )
