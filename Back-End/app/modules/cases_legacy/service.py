from typing import Optional

from pymongo.database import Database

from .repository import LegacyCaseRepository
from .schemas import LegacyCaseListResponse, LegacyCaseResponse


class LegacyCaseService:
    def __init__(self, db: Database):
        self.repo = LegacyCaseRepository(db)

    def list_cases(
        self,
        search: Optional[str] = None,
        entity: Optional[str] = None,
        received_from: Optional[str] = None,
        received_to: Optional[str] = None,
        skip: int = 0,
        limit: int = 25,
    ) -> LegacyCaseListResponse:
        docs, total = self.repo.find_many(
            search=search,
            entity=entity,
            received_from=received_from,
            received_to=received_to,
            skip=skip,
            limit=limit,
        )
        return LegacyCaseListResponse(
            data=[LegacyCaseResponse(**d) for d in docs],
            total=total,
        )

    def get_case(self, case_id: str) -> Optional[LegacyCaseResponse]:
        doc = self.repo.find_by_id(case_id)
        if not doc:
            return None
        return LegacyCaseResponse(**doc)

    def get_available_entities(self) -> list[str]:
        return self.repo.get_available_entities()
