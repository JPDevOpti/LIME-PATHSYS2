from typing import Any, Dict, List

from pymongo.database import Database

from .repository import DashboardRepository


class DashboardService:
    def __init__(self, db: Database):
        self.repository = DashboardRepository(db)

    def get_metrics(self, pathologist_name: str = None) -> Dict[str, Any]:
        return self.repository.get_metrics(pathologist_name)

    def get_monthly_cases_data(self, pathologist_name: str = None) -> Dict[str, Any]:
        return self.repository.get_monthly_cases_data(pathologist_name)

    def get_urgent_cases(
        self, pathologist_name: str = None, limit: int = 10
    ) -> List[Dict[str, Any]]:
        return self.repository.get_urgent_cases(pathologist_name, limit)

    def get_opportunity_stats(self, pathologist_name: str = None) -> Dict[str, Any]:
        return self.repository.get_opportunity_stats(pathologist_name)
