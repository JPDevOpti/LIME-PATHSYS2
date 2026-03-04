"""Servicio de entidades."""

from typing import Any, Optional

from app.core.exceptions import conflict_exception, not_found_exception
from app.modules.entities.repository import EntitiesRepository
from app.modules.entities.schemas import EntityCreate, EntityUpdate


class EntitiesService:
    def __init__(self, repo: EntitiesRepository) -> None:
        self._repo = repo

    def list_entities(
        self,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> dict[str, Any]:
        data, total = self._repo.find_many(
            search=search, is_active=is_active, skip=skip, limit=limit
        )
        return {"data": data, "total": total}

    def get_by_code(self, code: str) -> dict[str, Any]:
        entity = self._repo.find_by_code(code)
        if not entity:
            raise not_found_exception("Entity", code)
        return entity

    def create(self, data: EntityCreate) -> dict[str, Any]:
        code = data.code.strip().upper()
        if self._repo.code_exists(code):
            raise conflict_exception("Ya existe una entidad con este codigo")
        payload = {
            "name": data.name.strip(),
            "code": code,
            "observations": data.observations.strip() if data.observations else None,
            "is_active": data.is_active,
        }
        return self._repo.create(payload)

    def update(self, code: str, data: EntityUpdate) -> dict[str, Any]:
        existing = self._repo.find_by_code(code)
        if not existing:
            raise not_found_exception("Entity", code)
        payload = data.model_dump(exclude_none=True)
        if "observations" in payload and payload["observations"] is not None:
            payload["observations"] = payload["observations"].strip() or None
        result = self._repo.update_by_code(code, payload)
        if not result:
            raise not_found_exception("Entity", code)
        return result
