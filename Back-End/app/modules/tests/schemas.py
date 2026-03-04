"""Esquemas para el modulo de pruebas."""

from typing import Optional, List

from pydantic import BaseModel, Field


class TestAgreement(BaseModel):
    entity_id: str
    entity_name: str
    price: float = Field(..., ge=0)


class TestCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    test_code: str = Field(..., min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$")
    description: Optional[str] = Field(None, max_length=1000)
    time: int = Field(default=1, ge=1, le=365)
    price: float = Field(default=0, ge=0)
    is_active: bool = True
    agreements: Optional[List[TestAgreement]] = Field(default_factory=list)


class TestUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    time: Optional[int] = Field(None, ge=1, le=365)
    price: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None
    agreements: Optional[List[TestAgreement]] = None


class TestResponse(BaseModel):
    id: str
    name: str
    test_code: str
    description: Optional[str] = None
    time: int = 1
    price: float = 0
    is_active: bool = True
    agreements: List[TestAgreement] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TestListResponse(BaseModel):
    data: list[TestResponse]
    total: int
