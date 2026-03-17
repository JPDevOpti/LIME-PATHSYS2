from typing import Literal, Optional

from pydantic import BaseModel, Field

IdentificationTypeStr = Literal["CC", "TI", "RC", "PA", "CE", "DE", "SC", "NIT", "CD", "NN"]


class AuditEntrySchema(BaseModel):
    action: Literal["created", "updated"]
    user_email: str
    timestamp: str


class EntityInfoSchema(BaseModel):
    entity_name: Optional[str] = None
    eps_name: Optional[str] = None


class PatientLocationSchema(BaseModel):
    country: Optional[str] = None
    department: Optional[str] = None
    municipality: Optional[str] = None
    subregion: Optional[str] = None
    address: Optional[str] = None


class PatientCreate(BaseModel):
    identification_type: IdentificationTypeStr = Field(...)
    identification_number: str = Field(..., min_length=4, max_length=20, pattern=r"^[a-zA-Z0-9]+$")
    first_name: str = Field(..., min_length=2)
    second_name: Optional[str] = None
    first_lastname: str = Field(..., min_length=2)
    second_lastname: Optional[str] = None
    birth_date: Optional[str] = None
    gender: str = Field(..., pattern="^(Masculino|Femenino)$")
    phone: Optional[str] = None
    email: Optional[str] = None
    care_type: str = Field(..., pattern="^(Ambulatorio|Hospitalizado)$")
    entity_info: Optional[EntityInfoSchema] = None
    location: Optional[PatientLocationSchema] = None
    observations: Optional[str] = None


class PatientUpdate(BaseModel):
    identification_type: Optional[IdentificationTypeStr] = None
    identification_number: Optional[str] = Field(None, min_length=4, max_length=20, pattern=r"^[a-zA-Z0-9]+$")
    first_name: Optional[str] = None
    second_name: Optional[str] = None
    first_lastname: Optional[str] = None
    second_lastname: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^(Masculino|Femenino)$")
    phone: Optional[str] = None
    email: Optional[str] = None
    care_type: Optional[str] = Field(None, pattern="^(Ambulatorio|Hospitalizado)$")
    entity_info: Optional[EntityInfoSchema] = None
    location: Optional[PatientLocationSchema] = None
    observations: Optional[str] = None


class PatientResponse(BaseModel):
    id: str
    patient_code: str
    identification_type: str
    identification_number: str
    first_name: str
    second_name: Optional[str] = None
    first_lastname: str
    second_lastname: Optional[str] = None
    full_name: Optional[str] = None
    birth_date: Optional[str] = None
    gender: str
    phone: Optional[str] = None
    email: Optional[str] = None
    care_type: str
    entity_info: Optional[EntityInfoSchema] = None
    location: Optional[PatientLocationSchema] = None
    observations: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    audit_info: Optional[list[AuditEntrySchema]] = None


class PatientListResponse(BaseModel):
    data: list[PatientResponse]
    total: int


