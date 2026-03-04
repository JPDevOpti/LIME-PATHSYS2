"""Esquemas para el modulo de usuarios (perfiles)."""

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

RoleStr = Literal["administrator", "pathologist", "resident", "auxiliar", "visitante", "paciente"]


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr = Field(...)
    password: str = Field(..., min_length=8)
    role: RoleStr = Field(...)
    code: Optional[str] = Field(None, max_length=50)
    document: Optional[str] = Field(None, max_length=50)
    initials: Optional[str] = Field(None, max_length=10)
    medical_license: Optional[str] = Field(None, max_length=100)
    observations: Optional[str] = Field(None, max_length=1000)
    is_active: bool = True


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    role: Optional[RoleStr] = None
    code: Optional[str] = Field(None, max_length=50)
    document: Optional[str] = Field(None, max_length=50)
    initials: Optional[str] = Field(None, max_length=10)
    medical_license: Optional[str] = Field(None, max_length=100)
    observations: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None
    signature: Optional[str] = Field(None)


class UserResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    role: str
    code: Optional[str] = None
    document: Optional[str] = None
    initials: Optional[str] = None
    medical_license: Optional[str] = None
    observations: Optional[str] = None
    signature: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class UserListResponse(BaseModel):
    data: list[UserResponse]
    total: int
