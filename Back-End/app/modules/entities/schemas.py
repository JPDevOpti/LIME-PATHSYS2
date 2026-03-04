"""Esquemas para el modulo de entidades."""

from pydantic import BaseModel, Field


class EntityCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$")
    observations: str | None = Field(None, max_length=1000)
    is_active: bool = True


class EntityUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    observations: str | None = Field(None, max_length=1000)
    is_active: bool | None = None


class EntityResponse(BaseModel):
    id: str
    name: str
    code: str
    observations: str | None = None
    is_active: bool = True
    created_at: str | None = None
    updated_at: str | None = None


class EntityListResponse(BaseModel):
    data: list[EntityResponse]
    total: int
