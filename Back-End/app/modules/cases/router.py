from datetime import UTC, datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pymongo.database import Database

from app.core.dependencies import get_case_service
from app.database import get_db
from app.modules.auth.dependencies import get_current_user, get_current_user_id
from app.modules.cases.pdf_service import CasePdfService
from app.modules.cases.schemas import (
    CaseCreate,
    CaseListResponse,
    CaseResponse,
    CaseTranscriptionUpdate,
    CaseUpdate,
)
from app.modules.cases.service import CaseService
from app.security import verify_token

router = APIRouter()


class BatchPdfRequest(BaseModel):
    case_ids: list[str] | None = None
    case_codes: list[str] | None = None


def get_case_pdf_service(
    case_service: CaseService = Depends(get_case_service),
    db: Database = Depends(get_db),
) -> CasePdfService:
    return CasePdfService(case_service=case_service, db=db)


@router.get("", response_model=CaseListResponse)
def list_cases(
    search: str | None = Query(None),
    created_at_from: str | None = Query(None, alias="created_at_from"),
    created_at_to: str | None = Query(None, alias="created_at_to"),
    entity: str | None = Query(None),
    entity_names: list[str] = Query(default_factory=list, alias="entity_names"),
    assigned_pathologist: str | None = Query(None, alias="assigned_pathologist"),
    pathologist_name: str | None = Query(None, alias="pathologist_name"),
    assigned_pathologist_names: list[str] = Query(
        default_factory=list, alias="assigned_pathologist_names"
    ),
    priority: str | None = Query(None),
    test: str | None = Query(None),
    test_codes: list[str] = Query(default_factory=list, alias="test_codes"),
    state: str | None = Query(None),
    states: list[str] = Query(default_factory=list, alias="states"),
    doctor: str | None = Query(None),
    patient_id: str | None = Query(None, alias="patient_id"),
    identification_number: str | None = Query(None, alias="identification_number"),
    opportunity: str | None = Query(None),
    sort_by: str | None = Query(None, alias="sort_by"),
    sort_order: str | None = Query("desc", alias="sort_order"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100000),
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(get_current_user),
):
    result = service.list_cases(
        search=search,
        created_at_from=created_at_from,
        created_at_to=created_at_to,
        entity=entity,
        entity_names=entity_names,
        assigned_pathologist=assigned_pathologist,
        pathologist_name=pathologist_name,
        assigned_pathologist_names=assigned_pathologist_names,
        priority=priority,
        test=test,
        test_codes=test_codes,
        state=state,
        states=states,
        doctor=doctor,
        patient_id=patient_id,
        identification_number=identification_number,
        opportunity=opportunity,
        sort_by=sort_by,
        sort_order=sort_order or "desc",
        skip=skip,
        limit=limit,
        current_user=current_user,
    )
    return CaseListResponse(**result)


@router.get("/code/{code}", response_model=CaseResponse)
def get_case_by_code(
    code: str,
    service: CaseService = Depends(get_case_service),
    _: str = Depends(get_current_user_id),
):
    return service.get_by_code(code)


def _extract_token(request: Request) -> str:
    """Extrae JWT desde header Authorization o query param ?token=."""
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        raw = auth[7:].strip()
    else:
        raw = request.query_params.get("token", "")
    if not raw:
        raise HTTPException(status_code=401, detail="Token requerido")
    subject = verify_token(raw)
    if subject is None:
        raise HTTPException(status_code=401, detail="Token invalido o expirado")
    return subject


@router.get("/{id}/pdf")
def get_case_pdf(
    id: str,
    request: Request,
    pdf_service: CasePdfService = Depends(get_case_pdf_service),
):
    _extract_token(request)
    try:
        pdf_bytes, filename_base = pdf_service.generate_case_pdf_by_id(id)
        filename = f"{filename_base}.pdf"
        return StreamingResponse(
            iter([pdf_bytes]),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=\"{filename}\"; filename*=UTF-8''{quote(filename)}",
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Error generando PDF") from exc


@router.post("/batch/pdf")
def get_batch_pdf(
    request: BatchPdfRequest,
    pdf_service: CasePdfService = Depends(get_case_pdf_service),
    _: str = Depends(get_current_user_id),
):
    case_ids = request.case_ids or []
    case_codes = request.case_codes or []

    if not case_ids and not case_codes:
        raise HTTPException(status_code=400, detail="Debe enviar al menos un case_id o case_code")

    total_items = len(case_ids) + len(case_codes)
    if total_items > 100:
        raise HTTPException(status_code=400, detail="Máximo 100 casos por PDF")

    try:
        pdf_bytes = pdf_service.generate_batch_pdf(case_ids=case_ids, case_codes=case_codes)
        return StreamingResponse(
            iter([pdf_bytes]),
            media_type="application/pdf",
            headers={"Content-Disposition": "inline; filename*=UTF-8''casos_combinados.pdf"},
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Error generando PDF batch") from exc


@router.get("/{id}", response_model=CaseResponse)
def get_case(
    id: str,
    service: CaseService = Depends(get_case_service),
    _: str = Depends(get_current_user_id),
):
    return service.get_by_id(id)


@router.post("", response_model=CaseResponse, status_code=201)
def create_case(
    data: CaseCreate,
    current_user: dict = Depends(get_current_user),
    service: CaseService = Depends(get_case_service),
):
    return service.create(
        data,
        created_by_email=current_user.get("email"),
        created_by_name=current_user.get("name"),
    )


@router.put("/{id}/transcription", response_model=CaseResponse)
def update_case_transcription(
    id: str,
    data: CaseTranscriptionUpdate,
    skip_state_update: bool = False,
    current_user: dict = Depends(get_current_user),
    service: CaseService = Depends(get_case_service),
):
    return service.update_transcription(
        id,
        data,
        updated_by_email=current_user.get("email"),
        updated_by_name=current_user.get("name"),
        skip_state_update=skip_state_update,
    )


@router.put("/{id}/sign", response_model=CaseResponse)
def sign_case(
    id: str,
    data: CaseTranscriptionUpdate,
    user_id: str = Depends(get_current_user_id),
    current_user: dict = Depends(get_current_user),
    service: CaseService = Depends(get_case_service),
):
    """Firma el resultado. Solo administrador o patologo asignado."""
    return service.sign_case(
        id,
        data,
        user_id=user_id,
        current_user=current_user,
        updated_by_email=current_user.get("email"),
        updated_by_name=current_user.get("name"),
    )


@router.put("/{id}", response_model=CaseResponse)
def update_case(
    id: str,
    data: CaseUpdate,
    current_user: dict = Depends(get_current_user),
    service: CaseService = Depends(get_case_service),
):
    return service.update(
        id,
        data,
        updated_by_email=current_user.get("email"),
        updated_by_name=current_user.get("name"),
    )


@router.put("/{id}/patient", response_model=CaseResponse)
def update_case_patient(
    id: str,
    data: dict,
    service: CaseService = Depends(get_case_service),
    current_user: dict = Depends(get_current_user),
):
    """Actualiza la información del paciente incrustada en un caso específico."""
    return service.update_patient_info(
        id,
        data,
        updated_by_email=current_user.get("email"),
        updated_by_name=current_user.get("name"),
    )


@router.delete("/{id}", status_code=204)
def delete_case(
    id: str,
    service: CaseService = Depends(get_case_service),
    _: str = Depends(get_current_user_id),
):
    service.delete(id)


class NoteCreate(BaseModel):
    text: str


@router.post("/{id}/notes", response_model=CaseResponse)
def add_note(
    id: str,
    data: NoteCreate,
    service: CaseService = Depends(get_case_service),
    _: str = Depends(get_current_user_id),
):
    date_str = datetime.now(UTC).isoformat()
    return service.add_note(id, data.text, date_str)


@router.delete("/{id}/notes/{note_index}", status_code=204)
def delete_note(
    id: str,
    note_index: int,
    service: CaseService = Depends(get_case_service),
    _: str = Depends(get_current_user_id),
):
    service.delete_note(id, note_index)
