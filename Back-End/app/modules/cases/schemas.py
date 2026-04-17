from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from app.modules.patients.schemas import (
    EntityInfoSchema,
    PatientLocationSchema,
)


class CaseEntitySchema(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None


class AuditEntrySchema(BaseModel):
    action: Literal["created", "edited", "delivered", "signed", "transcribed"]
    user_name: str
    user_email: str
    timestamp: str
    details: Optional[list[str]] = None


class DateEntrySchema(BaseModel):
    created_at: Optional[str] = None
    update_at: Optional[str] = None
    transcribed_at: Optional[str] = None
    signed_at: Optional[str] = None
    delivered_at: Optional[str] = None


class OpportunityInfoSchema(BaseModel):
    opportunity_time: Optional[float] = None
    max_opportunity_time: Optional[float] = None
    was_timely: Optional[bool] = None


# PatientInfo embebido (copia del paciente)
class PatientInfoSchema(BaseModel):
    patient_id: Optional[str] = None
    patient_code: str
    identification_type: str
    identification_number: str
    first_name: str
    second_name: Optional[str] = None
    first_lastname: str
    second_lastname: Optional[str] = None
    full_name: Optional[str] = None
    birth_date: Optional[str] = None
    age_at_diagnosis: Optional[int] = None
    gender: str
    phone: Optional[str] = None
    email: Optional[str] = None
    care_type: str
    entity_info: Optional[EntityInfoSchema] = None
    location: Optional[PatientLocationSchema] = None
    observations: Optional[str] = None


class TestInfoSchema(BaseModel):
    id: Optional[str] = None
    test_code: str
    name: str
    quantity: int


class SampleInfoSchema(BaseModel):
    body_region: str
    tests: list[TestInfoSchema]


class ComplementaryTestSchema(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    quantity: Optional[int] = None
    reason: Optional[str] = None


class CieDiagnosisSchema(BaseModel):
    code: str
    name: str


class CaseResultSchema(BaseModel):
    method: Optional[list[str]] = None
    macro_result: Optional[str] = None
    micro_result: Optional[str] = None
    diagnosis: Optional[str] = None
    cie10_diagnosis: Optional[CieDiagnosisSchema] = None
    cieo_diagnosis: Optional[CieDiagnosisSchema] = None
    diagnosis_images: Optional[list[str]] = None


class AssignedPathologistSchema(BaseModel):
    id: str
    name: str
    pathologist_code: Optional[str] = None
    medical_license: Optional[str] = None
    role: Optional[str] = None


class NoteSchema(BaseModel):
    text: str
    date: str


# Create
class CaseCreate(BaseModel):
    patient_id: str = Field(...)
    priority: str = Field(..., pattern="^(Normal|Prioritario)$")
    requesting_physician: str = Field(..., min_length=1)
    service: Optional[str] = None
    observations: Optional[str] = None
    samples: list[SampleInfoSchema] = Field(...)
    max_opportunity_time: Optional[float] = Field(None, ge=0)
    previous_study: Optional[Any] = None
    entity: Optional[CaseEntitySchema] = None
    care_type: Optional[str] = None
    assigned_pathologist: Optional[AssignedPathologistSchema] = None
    assistant_pathologists: Optional[list[AssignedPathologistSchema]] = None


# Transcription update
class CaseTranscriptionUpdate(BaseModel):
    method: Optional[list[str]] = None
    macro_result: Optional[str] = None
    micro_result: Optional[str] = None
    diagnosis: Optional[str] = None
    cie10_diagnosis: Optional[CieDiagnosisSchema] = None
    cieo_diagnosis: Optional[CieDiagnosisSchema] = None
    diagnosis_images: Optional[list[str]] = None
    complementary_tests: Optional[list[ComplementaryTestSchema]] = None
    complementary_tests_reason: Optional[str] = None
    samples: Optional[list[SampleInfoSchema]] = None


# Update
class CaseUpdate(BaseModel):
    priority: Optional[str] = Field(None, pattern="^(Normal|Prioritario)$")
    requesting_physician: Optional[str] = Field(None, min_length=1)
    service: Optional[str] = None
    observations: Optional[str] = None
    samples: Optional[list[SampleInfoSchema]] = None
    max_opportunity_time: Optional[float] = Field(None, ge=0)
    state: Optional[str] = None
    care_type: Optional[str] = None
    entity: Optional[CaseEntitySchema] = None
    assigned_pathologist: Optional[AssignedPathologistSchema] = None
    assistant_pathologists: Optional[list[AssignedPathologistSchema]] = None
    assigned_resident: Optional[AssignedPathologistSchema] = None
    delivered_to: Optional[str] = None


# Response
class CaseResponse(BaseModel):
    id: str
    case_code: str
    state: Optional[str] = None
    priority: str
    service: Optional[str] = None
    requesting_physician: str
    assigned_pathologist: Optional[AssignedPathologistSchema] = None
    assistant_pathologists: Optional[list[AssignedPathologistSchema]] = None
    assigned_resident: Optional[AssignedPathologistSchema] = None
    patient_info: PatientInfoSchema
    samples: list[SampleInfoSchema]
    observations: Optional[str] = None
    entity: Optional[CaseEntitySchema] = None
    previous_study: Optional[Any] = None
    additional_notes: Optional[list[NoteSchema]] = None
    complementary_tests: Optional[list[ComplementaryTestSchema]] = None
    complementary_tests_reason: Optional[str] = None
    approval_state: Optional[str] = None
    opportunity_info: Optional[list[OpportunityInfoSchema]] = None
    result: Optional[CaseResultSchema] = None
    delivered_to: Optional[str] = None
    audit_info: Optional[list[AuditEntrySchema]] = None
    date_info: Optional[list[DateEntrySchema]] = None

    model_config = {"from_attributes": True}


class CaseListResponse(BaseModel):
    data: list[CaseResponse]
    total: int


class CaseFiltersSchema(BaseModel):
    search: Optional[str] = None
    created_at_from: Optional[str] = None
    created_at_to: Optional[str] = None
    entity: Optional[str] = None
    priority: Optional[str] = None
    test: Optional[str] = None
    state: Optional[str] = None
    doctor: Optional[str] = None
    patient_id: Optional[str] = None
    skip: Optional[int] = Field(None, ge=0)
    limit: Optional[int] = Field(None, ge=1, le=100)
