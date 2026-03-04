from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class LegacySampleSchema(BaseModel):
    number: Optional[int] = None
    anatomical_location: Optional[str] = None
    macroscopic: Optional[str] = None
    microscopic: Optional[str] = None
    test_type: Optional[str] = None
    lab_service: Optional[str] = None
    note: Optional[str] = None
    histoquimica: Optional[str] = None
    inmunohistoquimica: Optional[str] = None
    transcription_date: Optional[datetime] = None


class LegacyPatientSchema(BaseModel):
    # Snapshot of patient fields stored in legacy cases. Keep optional to be tolerant.
    patient_code: Optional[str] = None
    identification_number: Optional[str] = None
    identification_type: Optional[str] = None
    identification: Optional[str] = None
    first_name: Optional[str] = None
    second_name: Optional[str] = None
    first_lastname: Optional[str] = None
    second_lastname: Optional[str] = None
    full_name: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[datetime] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    care_type: Optional[str] = None
    entity_info: Optional[dict] = None
    location: Optional[dict] = None


class LegacyCaseResponse(BaseModel):
    id: str
    legacy_id: str
    is_legacy: bool = True
    patient: LegacyPatientSchema
    entity: Optional[str] = None
    care_type: Optional[str] = None
    previous_study: Optional[str] = None
    received_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    transcription_date: Optional[datetime] = None
    samples: list[LegacySampleSchema] = []
    imported_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LegacyCaseListResponse(BaseModel):
    data: list[LegacyCaseResponse]
    total: int


class LegacyCaseFiltersSchema(BaseModel):
    search: Optional[str] = None
    entity: Optional[str] = None
    received_from: Optional[str] = None
    received_to: Optional[str] = None
    skip: Optional[int] = Field(None, ge=0)
    limit: Optional[int] = Field(None, ge=1, le=100)
