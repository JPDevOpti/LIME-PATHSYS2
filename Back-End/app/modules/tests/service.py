"""Servicio de pruebas."""

from typing import Any, Optional

from app.core.exceptions import conflict_exception, not_found_exception
from app.modules.tests.repository import TestsRepository
from app.modules.tests.schemas import TestCreate, TestUpdate


class TestsService:
    def __init__(self, repo: TestsRepository) -> None:
        self._repo = repo

    def list_tests(
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
        test = self._repo.find_by_code(code)
        if not test:
            raise not_found_exception("Test", code)
        return test

    def create(self, data: TestCreate) -> dict[str, Any]:
        code = data.test_code.strip().upper()
        if self._repo.code_exists(code):
            raise conflict_exception("Ya existe una prueba con este codigo")
        payload = {
            "name": data.name.strip(),
            "test_code": code,
            "description": data.description.strip() if data.description else None,
            "time": data.time,
            "price": data.price,
            "is_active": data.is_active,
        }
        return self._repo.create(payload)

    def update(self, code: str, data: TestUpdate) -> dict[str, Any]:
        existing = self._repo.find_by_code(code)
        if not existing:
            raise not_found_exception("Test", code)

        test_id = existing["id"]
        payload = data.model_dump(exclude_none=True)

        if "description" in payload and payload["description"] is not None:
            payload["description"] = payload["description"].strip() or None

        # Normalizar test_code si viene en el payload
        if "test_code" in payload:
            new_code = payload["test_code"].strip().upper()
            if new_code != existing["test_code"]:
                if self._repo.code_exists(new_code, exclude_id=test_id):
                    raise conflict_exception("Ya existe una prueba con este codigo")
            payload["test_code"] = new_code

        if "name" in payload:
            payload["name"] = payload["name"].strip()

        result = self._repo.update_by_code(code, payload)
        if not result:
            raise not_found_exception("Test", code)

        # Propagar cambios de test_code y name a los casos
        propagate: dict[str, str] = {}
        if "test_code" in payload and payload["test_code"] != existing["test_code"]:
            propagate["test_code"] = payload["test_code"]
        if "name" in payload and payload["name"] != existing["name"]:
            propagate["name"] = payload["name"]
        if propagate:
            self._repo.propagate_to_cases(test_id, propagate)

        return result
