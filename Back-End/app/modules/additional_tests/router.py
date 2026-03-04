"""Rutas de solicitudes de pruebas adicionales."""

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_case_repository, get_case_service
from .schemas import (
    AdditionalTestsCreate,
    AdditionalTestRequestListResponse,
    AdditionalTestRequestResponse,
    AdditionalTestsUpdate,
)
from .service import AdditionalTestsService
from app.modules.auth.dependencies import get_current_user_id
from app.modules.cases.repository import CaseRepository
from app.modules.cases.service import CaseService


def get_additional_tests_service(
    case_repo: CaseRepository = Depends(get_case_repository),
    case_service: CaseService = Depends(get_case_service),
) -> AdditionalTestsService:
    return AdditionalTestsService(case_repo, case_service)


router = APIRouter(dependencies=[Depends(get_current_user_id)])


@router.get("", response_model=AdditionalTestRequestListResponse)
def list_additional_tests_requests(
    case_code: str | None = Query(None, alias="case_code", description="Codigo de caso (original_case_code)"),
    approval_state: str | None = Query(None, alias="approval_state"),
    entity: str | None = Query(None),
    pathologist_id: str | None = Query(None, alias="pathologist_id"),
    test_code: str | None = Query(None, alias="test_code"),
    created_at_from: str | None = Query(None, alias="created_at_from"),
    created_at_to: str | None = Query(None, alias="created_at_to"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: AdditionalTestsService = Depends(get_additional_tests_service),
):
    result = service.search(
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
    return AdditionalTestRequestListResponse(**result)


@router.get("/{case_code}", response_model=AdditionalTestRequestResponse)
def get_additional_tests_request(
    case_code: str,
    service: AdditionalTestsService = Depends(get_additional_tests_service),
):
    return AdditionalTestRequestResponse(**service.get_by_code(case_code))


@router.post("/{case_code}", response_model=AdditionalTestRequestResponse)
def create_additional_tests_request(
    case_code: str,
    data: AdditionalTestsCreate,
    service: AdditionalTestsService = Depends(get_additional_tests_service),
):
    return AdditionalTestRequestResponse(
        **service.create_request(
            case_code,
            data.additional_tests,
            data.additional_tests_reason,
        )
    )


@router.put("/{case_code}/manage", response_model=AdditionalTestRequestResponse)
def manage_additional_tests_request(
    case_code: str,
    service: AdditionalTestsService = Depends(get_additional_tests_service),
):
    return AdditionalTestRequestResponse(**service.manage(case_code))


@router.put("/{case_code}/approve")
def approve_additional_tests_request(
    case_code: str,
    service: AdditionalTestsService = Depends(get_additional_tests_service),
):
    return service.approve(case_code)


@router.put("/{case_code}/reject", response_model=AdditionalTestRequestResponse)
def reject_additional_tests_request(
    case_code: str,
    service: AdditionalTestsService = Depends(get_additional_tests_service),
):
    return AdditionalTestRequestResponse(**service.reject(case_code))


@router.put("/{case_code}/tests", response_model=AdditionalTestRequestResponse)
def update_additional_tests(
    case_code: str,
    data: AdditionalTestsUpdate,
    service: AdditionalTestsService = Depends(get_additional_tests_service),
):
    return AdditionalTestRequestResponse(**service.update_tests(case_code, data.resolved_tests()))
