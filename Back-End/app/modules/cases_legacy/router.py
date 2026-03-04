from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.modules.auth.dependencies import get_current_user

from .schemas import LegacyCaseListResponse, LegacyCaseResponse
from .service import LegacyCaseService
from .pdf_service import LegacyCasePdfService

router = APIRouter()


def get_service(db=Depends(get_db)) -> LegacyCaseService:
    return LegacyCaseService(db)

def get_legacy_pdf_service(
    service: LegacyCaseService = Depends(get_service),
    db=Depends(get_db),
) -> LegacyCasePdfService:
    return LegacyCasePdfService(service, db)


@router.get("/available-entities", response_model=List[str])
def get_available_entities(
    service: LegacyCaseService = Depends(get_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_available_entities()


@router.get("", response_model=LegacyCaseListResponse)
def list_cases(
    search: Optional[str] = Query(None),
    entity: Optional[str] = Query(None),
    received_from: Optional[str] = Query(None),
    received_to: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    service: LegacyCaseService = Depends(get_service),
    current_user: dict = Depends(get_current_user),
):
    return service.list_cases(
        search=search,
        entity=entity,
        received_from=received_from,
        received_to=received_to,
        skip=skip,
        limit=limit,
    )


@router.get("/{case_id}", response_model=LegacyCaseResponse)
def get_case(
    case_id: str,
    service: LegacyCaseService = Depends(get_service),
    current_user: dict = Depends(get_current_user),
):
    case = service.get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Caso legacy no encontrado")
    return case


from fastapi import Response
from urllib.parse import quote

@router.get("/{case_id}/pdf")
def get_legacy_case_pdf(
    case_id: str,
    pdf_service: LegacyCasePdfService = Depends(get_legacy_pdf_service),
    current_user: dict = Depends(get_current_user),
):
    try:
        pdf_bytes, case_code = pdf_service.generate_case_pdf_by_id(case_id)
        from fastapi.responses import StreamingResponse
        import io
        
        filename = f"historico_{case_code}.pdf".replace("/", "_").replace(" ", "_")
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename*=UTF-8''{quote(filename)}"
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
