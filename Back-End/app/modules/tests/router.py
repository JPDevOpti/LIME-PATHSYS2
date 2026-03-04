"""Rutas de pruebas. Listar/get: usuarios autenticados. Crear/actualizar: admin."""

from fastapi import APIRouter, Depends, Query

from app.modules.auth.dependencies import get_current_user_id
from app.modules.tests.schemas import TestCreate, TestListResponse, TestResponse, TestUpdate
from app.modules.tests.service import TestsService
from app.modules.users.router import require_admin


def get_tests_service() -> TestsService:
    from app.database import get_db
    from app.modules.tests.repository import TestsRepository
    return TestsService(TestsRepository(get_db()))


router = APIRouter(dependencies=[Depends(get_current_user_id)])


@router.get("", response_model=TestListResponse)
def list_tests(
    search: str | None = Query(None, alias="search"),
    is_active: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: TestsService = Depends(get_tests_service),
):
    return TestListResponse(**service.list_tests(search=search, is_active=is_active, skip=skip, limit=limit))


@router.get("/{code}", response_model=TestResponse)
def get_test(code: str, service: TestsService = Depends(get_tests_service)):
    return TestResponse(**service.get_by_code(code))


@router.post("", response_model=TestResponse, status_code=201, dependencies=[Depends(require_admin)])
def create_test(data: TestCreate, service: TestsService = Depends(get_tests_service)):
    return TestResponse(**service.create(data))


@router.put("/{code}", response_model=TestResponse, dependencies=[Depends(require_admin)])
def update_test(code: str, data: TestUpdate, service: TestsService = Depends(get_tests_service)):
    return TestResponse(**service.update(code, data))
