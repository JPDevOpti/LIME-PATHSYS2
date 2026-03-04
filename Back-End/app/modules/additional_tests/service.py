"""Servicio de solicitudes de pruebas adicionales."""

from datetime import datetime
from typing import Any, Optional

from fastapi import HTTPException

from app.core.exceptions import not_found_exception
from .schemas import AdditionalTestSchema
from app.modules.cases.repository import CaseRepository
from app.modules.cases.schemas import CaseCreate, SampleInfoSchema, TestInfoSchema, AssignedPathologistSchema
from app.modules.cases.service import CaseService


def _case_to_additional_test_response(case: dict) -> dict:
    """Convierte caso al formato AdditionalTestRequestResponse."""
    pi = case.get("patient_info") or {}
    ei = pi.get("entity_info") or {}
    entity = ei.get("entity_name") if isinstance(ei, dict) else None
    ap = case.get("assigned_pathologist") or {}
    tests = case.get("complementary_tests") or []
    created = case.get("created_at")
    updated = case.get("updated_at")
    if isinstance(created, datetime):
        created = created.isoformat()
    if isinstance(updated, datetime):
        updated = updated.isoformat()
    return {
        "id": case.get("id", ""),
        "approval_code": case.get("case_code", ""),
        "original_case_code": case.get("case_code", ""),
        "approval_state": case.get("approval_state", "request_made"),
        "entity": entity,
        "additional_tests": [
            {"code": t.get("code"), "name": t.get("name"), "quantity": t.get("quantity", 1)}
            for t in tests
        ],
        "approval_info": {
            "reason": case.get("complementary_tests_reason", ""),
            "request_date": created,
            "assigned_pathologist": (
                {"id": ap.get("id", ""), "name": ap.get("name", "")}
                if ap
                else None
            ),
        },
        "created_at": created,
        "updated_at": updated,
    }


class AdditionalTestsService:
    def __init__(
        self,
        case_repo: CaseRepository,
        case_service: CaseService,
    ):
        self._case_repo = case_repo
        self._case_service = case_service

    def search(
        self,
        case_code: Optional[str] = None,
        approval_state: Optional[str] = None,
        entity: Optional[str] = None,
        pathologist_id: Optional[str] = None,
        test_code: Optional[str] = None,
        created_at_from: Optional[str] = None,
        created_at_to: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> dict[str, Any]:
        data, total = self._case_repo.find_additional_tests_requests(
            case_code=case_code,
            approval_state=approval_state,
            entity=entity,
            pathologist_id=pathologist_id,
            test_code=test_code,
            created_at_from=created_at_from,
            created_at_to=created_at_to,
            skip=skip,
            limit=limit,
        )
        return {
            "data": [_case_to_additional_test_response(c) for c in data],
            "total": total,
        }

    def get_by_code(self, case_code: str) -> dict:
        case = self._case_repo.find_by_code(case_code.strip())
        if not case:
            raise not_found_exception("Additional test request", case_code)
        if not case.get("complementary_tests"):
            raise not_found_exception("Additional test request", case_code)
        return _case_to_additional_test_response(case)

    def create_request(
        self,
        case_code: str,
        additional_tests: list[AdditionalTestSchema],
        additional_tests_reason: str | None = None,
    ) -> dict:
        case = self._case_repo.find_by_code(case_code.strip())
        if not case:
            raise not_found_exception("Additional test request", case_code)

        tests_data = [
            {"code": t.code, "name": t.name, "quantity": t.quantity or 1}
            for t in additional_tests
        ]

        if not tests_data:
            raise HTTPException(status_code=400, detail="additional_tests must contain at least one test")

        result = self._case_repo.update_transcription(
            case["id"],
            result_data=case.get("result") or {},
            new_state=None,
            complementary_tests=tests_data,
            complementary_tests_reason=additional_tests_reason,
            approval_state="request_made",
        )
        if not result:
            raise not_found_exception("Additional test request", case_code)
        return _case_to_additional_test_response(result)

    def manage(self, case_code: str) -> dict:
        case = self._case_repo.find_by_code(case_code.strip())
        if not case:
            raise not_found_exception("Additional test request", case_code)
        result = self._case_repo.update_approval_state(case["id"], "pending_approval")
        if not result:
            raise not_found_exception("Additional test request", case_code)
        return _case_to_additional_test_response(result)

    def approve(self, case_code: str) -> dict[str, Any]:
        case = self._case_repo.find_by_code(case_code.strip())
        if not case:
            raise not_found_exception("Additional test request", case_code)
        tests = case.get("complementary_tests") or []
        if not tests:
            raise not_found_exception("Additional test request", case_code)
        
        patient_id = case.get("patient_info", {}).get("patient_id")
        patient_id = str(patient_id) if patient_id else ""
        if not patient_id:
            raise not_found_exception("Patient", "unknown")

        original_code = case.get("case_code", "")
        new_custom_code = f"{original_code}-1"

        # Heredar patólogos si existen
        assigned_pathologist = None
        if case.get("assigned_pathologist"):
            ap = case["assigned_pathologist"]
            assigned_pathologist = AssignedPathologistSchema(
                id=str(ap.get("id", "")),
                name=str(ap.get("name", "")),
                pathologist_code=str(ap.get("pathologist_code", "") or "") or None,
            )
        
        assistant_pathologists = None
        if case.get("assistant_pathologists"):
            assistant_pathologists = [
                AssignedPathologistSchema(
                    id=str(a.get("id", "")),
                    name=str(a.get("name", "")),
                    pathologist_code=str(a.get("pathologist_code", "") or "") or None,
                )
                for a in case["assistant_pathologists"]
            ]

        samples = [
            SampleInfoSchema(
                body_region="Pruebas adicionales",
                tests=[
                    TestInfoSchema(
                        id=t.get("code", ""),
                        name=t.get("name", ""),
                        quantity=t.get("quantity", 1),
                    )
                    for t in tests
                ],
            )
        ]
        create_data = CaseCreate(
            patient_id=patient_id,
            priority=case.get("priority", "Normal"),
            requesting_physician=case.get("requesting_physician", ""),
            service=case.get("service"),
            observations=f"Solicitud aprobada desde caso {original_code}",
            samples=samples,
            assigned_pathologist=assigned_pathologist,
            assistant_pathologists=assistant_pathologists,
            previous_study=original_code
        )
        new_case = self._case_service.create(create_data, created_by_email=None, custom_case_code=new_custom_code)
        self._case_repo.update_approval_state(case["id"], "approved")
        return {
            "data": {"new_case": new_case},
            "approval": _case_to_additional_test_response(
                self._case_repo.find_by_id(case["id"])
            ),
        }

    def reject(self, case_code: str) -> dict:
        case = self._case_repo.find_by_code(case_code.strip())
        if not case:
            raise not_found_exception("Additional test request", case_code)
        result = self._case_repo.update_approval_state(case["id"], "rejected")
        if not result:
            raise not_found_exception("Additional test request", case_code)
        return _case_to_additional_test_response(result)

    def update_tests(
        self, case_code: str, additional_tests: list[AdditionalTestSchema]
    ) -> dict:
        case = self._case_repo.find_by_code(case_code.strip())
        if not case:
            raise not_found_exception("Additional test request", case_code)
        tests_data = [
            {"code": t.code, "name": t.name, "quantity": t.quantity or 1}
            for t in additional_tests
        ]
        result = self._case_repo.update_complementary_tests(case["id"], tests_data)
        if not result:
            raise not_found_exception("Additional test request", case_code)
        return _case_to_additional_test_response(result)
