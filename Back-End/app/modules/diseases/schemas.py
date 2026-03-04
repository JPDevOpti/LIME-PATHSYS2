from pydantic import BaseModel, Field


class DiseaseCreate(BaseModel):
    code: str = Field(..., description="Código CIE-10 o CIE-O")
    name: str = Field(..., description="Nombre del diagnóstico")
    table: str = Field(..., description="Tabla: CIE10 o CIEO")


class DiseaseResponse(BaseModel):
    id: str
    table: str
    code: str
    name: str
    description: str | None = None
    is_active: bool = True


class DiseaseSearchResponse(BaseModel):
    diseases: list[DiseaseResponse]
    search_term: str
    skip: int
    limit: int


class DiseaseCountResponse(BaseModel):
    total: int
    diseases_collection: int
    cie10_collection: int
    cieo_collection: int
