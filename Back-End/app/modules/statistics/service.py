from typing import Any

from pymongo.database import Database

from .repository import StatisticsRepository


class StatisticsService:
    def __init__(self, db: Database):
        self.repo = StatisticsRepository(db)

    def get_opportunity_report(
        self, year: int, month: int, entity_name: str | None = None
    ) -> dict[str, Any]:
        return self.repo.get_opportunity_report(year, month, entity_name)

    def get_entities_report(self, year: int, month: int) -> dict[str, Any]:
        return self.repo.get_entities_report(year, month)

    def get_entity_details(
        self, entity_name: str, year: int, month: int
    ) -> dict[str, Any]:
        return self.repo.get_entity_details(entity_name, year, month)

    def get_tests_report(
        self, year: int, month: int, entity_name: str | None = None
    ) -> dict[str, Any]:
        return self.repo.get_tests_report(year, month, entity_name)

    def get_pathologists_report(self, year: int, month: int) -> list[dict[str, Any]]:
        return self.repo.get_pathologists_report(year, month)

    def get_pathologist_entities(
        self, pathologist_name: str, year: int, month: int
    ) -> dict[str, Any]:
        entidades = self.repo.get_pathologist_entities(pathologist_name, year, month)
        return {"entidades": entidades}

    def get_pathologist_tests(
        self, pathologist_name: str, year: int, month: int
    ) -> dict[str, Any]:
        pruebas = self.repo.get_pathologist_tests(pathologist_name, year, month)
        return {"pruebas": pruebas}

    def get_available_entities(self) -> list[str]:
        return self.repo.get_available_entities()

    def get_available_pathologists(self) -> list[str]:
        return self.repo.get_available_pathologists()
