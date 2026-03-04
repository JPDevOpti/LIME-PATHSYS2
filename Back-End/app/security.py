"""Funciones de seguridad: JWT y contraseñas."""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from jwt.exceptions import PyJWTError
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")


def create_access_token(
    subject: Any,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[dict[str, Any]] = None,
) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    to_encode: dict[str, Any] = {"exp": expire, "sub": str(subject)}
    if extra_claims:
        to_encode.update(extra_claims)
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        scheme = pwd_context.identify(hashed_password) or ""
    except Exception:
        scheme = ""
    if (scheme.startswith("bcrypt") or hashed_password.startswith("$2")) and len(
        plain_password.encode("utf-8")
    ) > 72:
        plain_password = plain_password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except PyJWTError:
        return None


def verify_token_payload(token: str) -> Optional[dict]:
    payload = decode_token(token)
    if not payload or not payload.get("exp") or not payload.get("sub"):
        return None
    exp_dt = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    if datetime.now(timezone.utc) > exp_dt:
        return None
    return payload


def verify_token(token: str) -> Optional[str]:
    payload = verify_token_payload(token)
    return payload.get("sub") if payload else None
