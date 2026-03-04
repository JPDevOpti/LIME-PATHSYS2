"""Rutas de casos sin lectura."""

from fastapi import APIRouter, Depends, Query

from app.modules.auth.dependencies import get_current_user, get_current_user_id
from app.modules.unread_cases.schemas import (
    BulkMarkDeliveredPayload,
    UnreadCaseCreate,
    UnreadCaseListResponse,
    UnreadCaseResponse,
    UnreadCaseUpdate,
)
from app.modules.unread_cases.service import UnreadCasesService


def get_unread_cases_service() -> UnreadCasesService:
    from app.database import get_db
    from app.modules.unread_cases.repository import UnreadCasesRepository
    return UnreadCasesService(UnreadCasesRepository(get_db()))


router = APIRouter(dependencies=[Depends(get_current_user_id)])


@router.get("", response_model=UnreadCaseListResponse)
def list_unread_cases(
    search: str | None = Query(None, alias="search"),
    institution: str | None = Query(None, alias="institution"),
    test_type: str | None = Query(None, alias="test_type"),
    status: str | None = Query(None, alias="status"),
    date_from: str | None = Query(None, alias="date_from"),
    date_to: str | None = Query(None, alias="date_to"),
    page: int = Query(1, ge=1, alias="page"),
    limit: int = Query(25, ge=1, le=100000, alias="limit"),
    service: UnreadCasesService = Depends(get_unread_cases_service),
):
    skip = (page - 1) * limit
    result = service.list_cases(
        search=search,
        institution=institution,
        test_type=test_type,
        status=status,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit,
    )
    return UnreadCaseListResponse(**result)


@router.post("", response_model=UnreadCaseResponse, status_code=201)
def create_unread_case(
    data: UnreadCaseCreate,
    service: UnreadCasesService = Depends(get_unread_cases_service),
):
    return UnreadCaseResponse(**service.create(data))


@router.post("/mark-delivered", response_model=list[UnreadCaseResponse])
def mark_delivered(
    data: BulkMarkDeliveredPayload,
    service: UnreadCasesService = Depends(get_unread_cases_service),
):
    result = service.mark_delivered(data)
    return [UnreadCaseResponse(**r) for r in result]


@router.get("/{case_code}", response_model=UnreadCaseResponse)
def get_unread_case(
    case_code: str,
    service: UnreadCasesService = Depends(get_unread_cases_service),
):
    return UnreadCaseResponse(**service.get_by_case_code(case_code))


@router.delete("/{case_code}", status_code=204)
def delete_unread_case(
    case_code: str,
    service: UnreadCasesService = Depends(get_unread_cases_service),
):
    service.delete(case_code)

@router.put("/{case_code}", response_model=UnreadCaseResponse)
def update_unread_case(
    case_code: str,
    data: UnreadCaseUpdate,
    current_user: dict = Depends(get_current_user),
    service: UnreadCasesService = Depends(get_unread_cases_service),
):
    updated_by = current_user.get("name") or current_user.get("email", "")
    return UnreadCaseResponse(**service.update(case_code, data, updated_by=updated_by))
