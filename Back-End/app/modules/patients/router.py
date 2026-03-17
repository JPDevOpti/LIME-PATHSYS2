from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_patient_service
from app.modules.auth.dependencies import get_current_user, get_current_user_id
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
    search: str | None = Query(None),
    created_at_from: str | None = Query(None),
    created_at_to: str | None = Query(None),
    entity: str | None = Query(None),
    care_type: str | None = Query(None),
    gender: str | None = Query(None),
    municipality_code: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100000),
    service: PatientService = Depends(get_patient_service),
    _: str = Depends(get_current_user_id),
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
    _: str = Depends(get_current_user_id),
):
    return service.get_by_id(id)


@router.post("", response_model=PatientResponse, status_code=201)
def create_patient(
    data: PatientCreate,
    current_user: dict = Depends(get_current_user),
    service: PatientService = Depends(get_patient_service),
):
    return service.create(data, created_by_email=current_user.get("email"))


@router.put("/{id}", response_model=PatientResponse)
def update_patient(
    id: str,
    data: PatientUpdate,
    current_user: dict = Depends(get_current_user),
    service: PatientService = Depends(get_patient_service),
):
    return service.update(id, data, updated_by_email=current_user.get("email"))


@router.delete("/{id}", status_code=204)
def delete_patient(
    id: str,
    service: PatientService = Depends(get_patient_service),
    _: str = Depends(get_current_user_id),
):
    service.delete(id)
