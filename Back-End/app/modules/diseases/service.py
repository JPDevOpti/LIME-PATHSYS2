"""Servicio de enfermedades (CIE-10, CIE-O)."""

from app.modules.diseases.repository import DiseasesRepository
from app.modules.diseases.schemas import DiseaseResponse, DiseaseSearchResponse


class DiseasesService:
    def __init__(self, repo: DiseasesRepository) -> None:
        self._repo = repo

    def create(self, data):
        # data: DiseaseCreate
        # Insertar en la colección y devolver el objeto creado
        obj = {
            "code": data.code,
            "name": data.name,
            "table": data.table,
        }
        inserted = self._repo.collection.insert_one(obj)
        obj["id"] = str(inserted.inserted_id)
        return DiseaseResponse(**obj)

    def search(
        self,
        query: str,
        table: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> DiseaseSearchResponse:
        if not query or not query.strip():
            return DiseaseSearchResponse(
                diseases=[],
                search_term=query or "",
                skip=skip,
                limit=limit,
            )
        data = self._repo.search(
            query=query.strip(),
            table=table,
            skip=skip,
            limit=limit,
        )
        return DiseaseSearchResponse(
            diseases=[DiseaseResponse(**d) for d in data],
            search_term=query.strip(),
            skip=skip,
            limit=limit,
        )
