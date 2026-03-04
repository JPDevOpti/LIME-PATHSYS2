"""Servicio de autenticación."""

from datetime import timedelta
from typing import Any

from app.config import settings
from app.modules.auth.repository import AuthRepository
from app.security import create_access_token, verify_password


def _public_user(doc: dict[str, Any]) -> dict[str, Any]:
    role = doc.get("role", "")
    if str(role).strip().lower() == "auxiliar":
        role = "recepcionista"
    elif str(role).strip().lower() == "billing":
        role = "visitante"
    out: dict[str, Any] = {
        "id": doc.get("_id"),
        "name": doc.get("name"),
        "email": doc.get("email"),
        "role": role,
        "is_active": doc.get("is_active", True),
        "administrator_code": doc.get("administrator_code"),
        "pathologist_code": doc.get("pathologist_code"),
        "resident_code": doc.get("resident_code"),
        "associated_entities": doc.get("associated_entities", []),
    }
    # Campos de perfil para roles especificos
    if doc.get("medical_license") is not None:
        out["medical_license"] = doc["medical_license"]
    if doc.get("initials") is not None:
        out["initials"] = doc["initials"]
    out["signature"] = doc.get("signature", "")
    if doc.get("observations") is not None:
        out["observations"] = doc["observations"]
    if doc.get("patient_id") is not None:
        out["patient_id"] = str(doc["patient_id"])
    if doc.get("document") is not None:
        out["document"] = doc["document"]
    return out


class AuthService:
    def __init__(self, repo: AuthRepository) -> None:
        self.repo = repo

    def _get_expires_delta(self, remember_me: bool) -> timedelta:
        mins = (
            settings.access_token_expire_minutes_remember_me
            if remember_me
            else settings.access_token_expire_minutes
        )
        return timedelta(minutes=mins)

    def login(self, email: str, password: str, remember_me: bool = False) -> dict[str, Any]:
        # Si el identificador no tiene "@", asumir que es número de documento de paciente
        if "@" not in email:
            email = f"{email.strip()}@paciente.dermapath.local"
        user = self.repo.get_user_by_email(email)
        if not user:
            raise ValueError("Invalid credentials")
        if not verify_password(password, user.get("password_hash", "")):
            raise ValueError("Invalid credentials")
        expires_delta = self._get_expires_delta(remember_me)
        token = create_access_token(
            subject=user["_id"],
            expires_delta=expires_delta,
            extra_claims={"rm": bool(remember_me)},
        )
        return {
            "token": {
                "access_token": token,
                "token_type": "bearer",
                "expires_in": int(expires_delta.total_seconds()),
            },
            "user": _public_user(user),
        }

    def get_user_public_by_id(self, user_id: str) -> dict[str, Any]:
        user = self.repo.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found or inactive")
        return _public_user(user)

    def refresh_token(self, user_id: str, remember_me: bool = False) -> dict[str, Any]:
        user = self.repo.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        if not user.get("is_active", True):
            raise ValueError("User account is inactive")
        expires_delta = self._get_expires_delta(remember_me)
        token = create_access_token(
            subject=user["_id"],
            expires_delta=expires_delta,
            extra_claims={"rm": bool(remember_me)},
        )
        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": int(expires_delta.total_seconds()),
        }
