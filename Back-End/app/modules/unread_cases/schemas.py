"""Esquemas para el modulo de casos sin lectura."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class TestItemSchema(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    quantity: int = Field(..., ge=1)
    name: Optional[str] = None


class TestGroupSchema(BaseModel):
    type: Literal["LOW_COMPLEXITY_IHQ", "HIGH_COMPLEXITY_IHQ", "SPECIAL_IHQ", "HISTOCHEMISTRY"]
    tests: list[TestItemSchema] = Field(..., min_length=1)
    observations: Optional[str] = None


class UnreadCaseCreate(BaseModel):
    case_code: Optional[str] = Field(None, max_length=50)
    is_special_case: Optional[bool] = False
    document_type: Optional[str] = Field(None, max_length=10)
    patient_document: Optional[str] = Field(None, max_length=20)
    patient_name: Optional[str] = Field(None, max_length=200)
    entity_code: str = Field(..., min_length=1, max_length=50)
    entity_name: Optional[str] = Field(None, max_length=200)
    institution: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=500)
    test_groups: Optional[list[TestGroupSchema]] = None
    number_of_plates: Optional[int] = Field(None, ge=1)
    entry_date: Optional[str] = None
    received_by: Optional[str] = Field(None, max_length=200)
    status: Optional[str] = Field(None, max_length=50)


class UnreadCaseUpdate(BaseModel):
    is_special_case: Optional[bool] = None
    document_type: Optional[str] = Field(None, max_length=10)
    patient_name: Optional[str] = Field(None, max_length=200)
    patient_document: Optional[str] = Field(None, max_length=20)
    entity_code: Optional[str] = Field(None, max_length=50)
    entity_name: Optional[str] = Field(None, max_length=200)
    institution: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=500)
    test_groups: Optional[list[TestGroupSchema]] = None
    number_of_plates: Optional[int] = Field(None, ge=1)
    status: Optional[str] = Field(None, max_length=50)


class BulkMarkDeliveredPayload(BaseModel):
    case_codes: list[str] = Field(..., min_length=1)
    delivered_to: str = Field(..., min_length=1, max_length=200)
    delivery_date: Optional[str] = None


class UnreadCaseResponse(BaseModel):
    id: str
    case_code: str
    is_special_case: Optional[bool] = None
    document_type: Optional[str] = None
    patient_document: Optional[str] = None
    patient_name: Optional[str] = None
    entity_code: Optional[str] = None
    entity_name: Optional[str] = None
    institution: Optional[str] = None
    notes: Optional[str] = None
    test_groups: Optional[list[dict]] = None
    number_of_plates: Optional[int] = None
    delivered_to: Optional[str] = None
    delivery_date: Optional[str] = None
    entry_date: Optional[str] = None
    received_by: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


class UnreadCaseListResponse(BaseModel):
    data: list[UnreadCaseResponse]
    total: int
