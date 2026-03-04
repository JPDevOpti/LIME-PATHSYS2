"""Rutas de usuarios (perfiles). Solo administradores."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.auth.dependencies import get_current_user_id
from app.modules.auth.service import AuthService
from app.modules.users.schemas import UserCreate, UserListResponse, UserResponse, UserUpdate
from app.modules.users.service import UsersService


def get_auth_service() -> AuthService:
    from app.database import get_db
    from app.modules.auth.repository import AuthRepository
    return AuthService(AuthRepository(get_db()))


def get_users_service() -> UsersService:
    from app.database import get_db
    from app.modules.users.repository import UsersRepository
    from app.modules.patients.repository import PatientRepository
    db = get_db()
    return UsersService(UsersRepository(db), PatientRepository(db))


pathologists_router = APIRouter(dependencies=[Depends(get_current_user_id)])


@pathologists_router.get("/pathologists", response_model=UserListResponse)
def list_pathologists(
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: UsersService = Depends(get_users_service),
):
    """Lista patólogos para asignación. Requiere autenticación (no admin)."""
    return UserListResponse(**service.list_users(
        search=search, role="pathologist", is_active=is_active, skip=skip, limit=limit
    ))


def require_admin(
    user_id: str = Depends(get_current_user_id),
    auth_service: AuthService = Depends(get_auth_service),
) -> str:
    try:
        user = auth_service.get_user_public_by_id(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    role = str(user.get("role", "")).lower()
    if role not in ("administrator", "administrador"):
        raise HTTPException(status_code=403, detail="Solo administradores pueden gestionar perfiles")
    return user_id


router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=UserListResponse)
def list_users(
    search: str | None = Query(None, alias="search"),
    role: str | None = Query(None),
    is_active: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: UsersService = Depends(get_users_service),
):
    return UserListResponse(**service.list_users(search=search, role=role, is_active=is_active, skip=skip, limit=limit))


@router.get("/{id}", response_model=UserResponse)
def get_user(id: str, service: UsersService = Depends(get_users_service)):
    return UserResponse(**service.get_by_id(id))


@router.post("", response_model=UserResponse, status_code=201)
def create_user(data: UserCreate, service: UsersService = Depends(get_users_service)):
    return UserResponse(**service.create(data))


@router.put("/{id}", response_model=UserResponse)
def update_user(id: str, data: UserUpdate, service: UsersService = Depends(get_users_service)):
    return UserResponse(**service.update(id, data))
