"""Esquemas para el modulo de entidades."""

from typing import Optional

from pydantic import BaseModel, Field


class EntityCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$")
    observations: Optional[str] = Field(None, max_length=1000)
    is_active: bool = True


class EntityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    observations: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None


class EntityResponse(BaseModel):
    id: str
    name: str
    code: str
    observations: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class EntityListResponse(BaseModel):
    data: list[EntityResponse]
    total: int
