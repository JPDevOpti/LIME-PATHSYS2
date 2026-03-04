"""Rutas de autenticación."""

from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import LoginRequest, LoginResponse
from app.modules.auth.service import AuthService
from app.modules.users.schemas import UserResponse, UserUpdate
from app.security import verify_token_payload
from .dependencies import oauth2_scheme, get_current_user_id

router = APIRouter()


def get_auth_service() -> AuthService:
    return AuthService(AuthRepository(get_db()))


def get_users_service():
    from app.modules.users.repository import UsersRepository
    from app.modules.users.service import UsersService
    from app.modules.patients.repository import PatientRepository
    db = get_db()
    return UsersService(UsersRepository(db), PatientRepository(db))


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, service: AuthService = Depends(get_auth_service)):
    try:
        return service.login(payload.email, payload.password, payload.remember_me)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception:
        raise HTTPException(status_code=500, detail="Authentication error")


@router.get("/me")
def me(user_id: str = Depends(get_current_user_id), service: AuthService = Depends(get_auth_service)):
    try:
        return service.get_user_public_by_id(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found")
    except Exception:
        raise HTTPException(status_code=500, detail="Internal error")


@router.post("/refresh")
def refresh(
    token: str = Depends(oauth2_scheme),
    service: AuthService = Depends(get_auth_service),
):
    try:
        payload = verify_token_payload(token)
        if payload is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        user_id = payload.get("sub")
        remember_me = bool(payload.get("rm", False))
        return service.refresh_token(user_id, remember_me=remember_me)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=500, detail="Internal error")


@router.put("/profile")
def update_profile(
    payload: UserUpdate,
    user_id: str = Depends(get_current_user_id),
    service=Depends(get_users_service),
):
    """Actualiza el perfil del usuario autenticado."""
    try:
        return UserResponse(**service.update(user_id, payload))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al actualizar perfil: {str(e)}")
