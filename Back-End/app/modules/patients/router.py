from fastapi import APIRouter, Depends, Header, Query

from app.core.dependencies import get_patient_service
from app.modules.patients.schemas import (
    PatientCreate,
    PatientListResponse,
    PatientResponse,
    PatientUpdate,
)
from app.modules.patients.service import PatientService

router = APIRouter()


@router.get("", response_model=PatientListResponse)
def list_patients(
    search: str | None = Query(None, alias="search"),
    created_at_from: str | None = Query(None, alias="created_at_from"),
    created_at_to: str | None = Query(None, alias="created_at_to"),
    entity: str | None = Query(None),
    care_type: str | None = Query(None),
    gender: str | None = Query(None),
    municipality_code: str | None = Query(None, alias="municipality_code"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100000),
    service: PatientService = Depends(get_patient_service),
):
    result = service.list_patients(
        search=search,
        created_at_from=created_at_from,
        created_at_to=created_at_to,
        entity=entity,
        care_type=care_type,
        gender=gender,
        municipality_code=municipality_code,
        skip=skip,
        limit=limit,
    )
    return PatientListResponse(**result)


@router.get("/{id}", response_model=PatientResponse)
def get_patient(
    id: str,
    service: PatientService = Depends(get_patient_service),
):
    return service.get_by_id(id)


@router.post("", response_model=PatientResponse, status_code=201)
def create_patient(
    data: PatientCreate,
    x_user_email: str | None = Header(None, alias="X-User-Email"),
    service: PatientService = Depends(get_patient_service),
):
    return service.create(data, created_by_email=x_user_email)


@router.put("/{id}", response_model=PatientResponse)
def update_patient(
    id: str,
    data: PatientUpdate,
    x_user_email: str | None = Header(None, alias="X-User-Email"),
    service: PatientService = Depends(get_patient_service),
):
    return service.update(id, data, updated_by_email=x_user_email)


@router.delete("/{id}", status_code=204)
def delete_patient(
    id: str,
    service: PatientService = Depends(get_patient_service),
):
    service.delete(id)
