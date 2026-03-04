"""Esquemas para solicitudes de pruebas adicionales."""

from typing import Literal, Optional

from pydantic import BaseModel


ApprovalState = Literal["request_made", "pending_approval", "approved", "rejected"]


class AdditionalTestSchema(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    quantity: Optional[int] = None


class AssignedPathologistSchema(BaseModel):
    id: str
    name: str


class ApprovalInfoSchema(BaseModel):
    reason: Optional[str] = None
    request_date: Optional[str] = None
    assigned_pathologist: Optional[AssignedPathologistSchema] = None


class AdditionalTestRequestResponse(BaseModel):
    id: str
    approval_code: str
    original_case_code: str
    approval_state: ApprovalState
    entity: Optional[str] = None
    additional_tests: list[AdditionalTestSchema]
    approval_info: ApprovalInfoSchema
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AdditionalTestRequestListResponse(BaseModel):
    data: list[AdditionalTestRequestResponse]
    total: int


class AdditionalTestsUpdate(BaseModel):
    additional_tests: Optional[list[AdditionalTestSchema]] = None

    def resolved_tests(self) -> list[AdditionalTestSchema]:
        return self.additional_tests or []


class AdditionalTestsCreate(BaseModel):
    additional_tests: list[AdditionalTestSchema]
    additional_tests_reason: Optional[str] = None
