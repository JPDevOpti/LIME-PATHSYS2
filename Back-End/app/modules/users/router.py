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
    include_signature: bool = Query(False),
    service: UsersService = Depends(get_users_service),
):
    """Lista patólogos para asignación. Requiere autenticación."""
    fields = ["id", "name", "email", "medical_license", "is_active", "role", "pathologist_code", "initials"] if not include_signature else None
    return UserListResponse(**service.list_users(
        search=search, 
        role="pathologist", 
        is_active=is_active, 
        skip=skip, 
        limit=limit,
        include_signature=include_signature,
        fields=fields
    ))


@pathologists_router.get("/residents", response_model=UserListResponse)
def list_residents(
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    include_signature: bool = Query(False),
    service: UsersService = Depends(get_users_service),
):
    """Lista residentes para asignación. Requiere autenticación."""
    fields = ["id", "name", "email", "resident_code", "is_active", "role", "initials"] if not include_signature else None
    return UserListResponse(**service.list_users(
        search=search, 
        role="resident", 
        is_active=is_active, 
        skip=skip, 
        limit=limit,
        include_signature=include_signature,
        fields=fields
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
    include_signature: bool = Query(False),
    service: UsersService = Depends(get_users_service),
):
    # Proyección ligera para el listado general (evita firmas y datos pesados)
    fields = [
        "id", "name", "email", "role", "is_active", "created_at", 
        "administrator_code", "pathologist_code", "resident_code", 
        "auxiliar_code", "initials", "medical_license"
    ] if not include_signature else None

    # EXCLUSIÓN TOTAL: Este endpoint es para gestión de personal. 
    # Los pacientes tienen su propio módulo y NUNCA deben aparecer aquí.
    return UserListResponse(**service.list_users(
        search=search, 
        role=role, 
        is_active=is_active, 
        skip=skip, 
        limit=limit,
        include_signature=include_signature,
        fields=fields,
        exclude_role="paciente"
    ))


@router.get("/{id}", response_model=UserResponse)
def get_user(
    id: str, 
    include_signature: bool = Query(True),
    service: UsersService = Depends(get_users_service)
):
    return UserResponse(**service.get_by_id(id, include_signature=include_signature))


@router.post("", response_model=UserResponse, status_code=201)
def create_user(data: UserCreate, service: UsersService = Depends(get_users_service)):
    return UserResponse(**service.create(data))


@router.put("/{id}", response_model=UserResponse)
def update_user(id: str, data: UserUpdate, service: UsersService = Depends(get_users_service)):
    return UserResponse(**service.update(id, data))
