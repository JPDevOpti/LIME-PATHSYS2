"""Rutas de entidades. Lectura autenticada; escritura solo administradores."""

from fastapi import APIRouter, Depends, Query

from app.modules.auth.dependencies import get_current_user_id
from app.modules.entities.schemas import EntityCreate, EntityListResponse, EntityResponse, EntityUpdate
from app.modules.entities.service import EntitiesService
from app.modules.users.router import require_admin


def get_entities_service() -> EntitiesService:
    from app.database import get_db
    from app.modules.entities.repository import EntitiesRepository
    return EntitiesService(EntitiesRepository(get_db()))


router = APIRouter()


@router.get("", response_model=EntityListResponse, dependencies=[Depends(get_current_user_id)])
def list_entities(
    search: str | None = Query(None, alias="search"),
    is_active: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: EntitiesService = Depends(get_entities_service),
):
    return EntityListResponse(**service.list_entities(search=search, is_active=is_active, skip=skip, limit=limit))


@router.get("/{code}", response_model=EntityResponse, dependencies=[Depends(get_current_user_id)])
def get_entity(code: str, service: EntitiesService = Depends(get_entities_service)):
    return EntityResponse(**service.get_by_code(code))


@router.post("", response_model=EntityResponse, status_code=201, dependencies=[Depends(require_admin)])
def create_entity(data: EntityCreate, service: EntitiesService = Depends(get_entities_service)):
    return EntityResponse(**service.create(data))


@router.put("/{code}", response_model=EntityResponse, dependencies=[Depends(require_admin)])
def update_entity(code: str, data: EntityUpdate, service: EntitiesService = Depends(get_entities_service)):
    return EntityResponse(**service.update(code, data))
