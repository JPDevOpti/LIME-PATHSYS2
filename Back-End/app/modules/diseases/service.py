"""Servicio de enfermedades (CIE-10, CIE-O)."""

from app.modules.diseases.repository import DiseasesRepository
from app.modules.diseases.schemas import (
    DiseaseCountResponse,
    DiseaseCreate,
    DiseaseResponse,
    DiseaseSearchResponse,
)


class DiseasesService:
    def __init__(self, repo: DiseasesRepository) -> None:
        self._repo = repo

    def create(self, data: DiseaseCreate) -> DiseaseResponse:
        obj = {
            "code": data.code,
            "name": data.name,
            "table": data.table,
        }
        inserted = self._repo.create(obj)
        return DiseaseResponse(**inserted)

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

    def count(self) -> DiseaseCountResponse:
        counts = self._repo.count_diseases()
        return DiseaseCountResponse(**counts)
