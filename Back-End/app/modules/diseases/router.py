
from fastapi import APIRouter, Depends, Query, HTTPException, status
from app.modules.auth.dependencies import get_current_user_id
from app.modules.diseases.schemas import DiseaseSearchResponse, DiseaseCreate, DiseaseResponse
from app.modules.diseases.service import DiseasesService

def get_diseases_service() -> DiseasesService:
    from app.database import get_db
    from app.modules.diseases.repository import DiseasesRepository
    return DiseasesService(DiseasesRepository(get_db()))

router = APIRouter(dependencies=[Depends(get_current_user_id)])

@router.get("/search", response_model=DiseaseSearchResponse)
def search_diseases(
    q: str = Query("", description="Buscar por nombre o codigo"),
    table: str | None = Query(None, description="Filtrar por tabla: CIE10 o CIEO"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: DiseasesService = Depends(get_diseases_service),
):
    """Busca enfermedades por nombre o codigo. Requiere autenticacion."""
    return service.search(query=q, table=table, skip=skip, limit=limit)

@router.post("/", response_model=DiseaseResponse, status_code=status.HTTP_201_CREATED)
def create_disease(
    data: DiseaseCreate,
    service: DiseasesService = Depends(get_diseases_service),
):
    """Crea un nuevo diagnóstico."""
    try:
        return service.create(data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
