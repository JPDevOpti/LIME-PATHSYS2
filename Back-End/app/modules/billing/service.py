from pymongo.database import Database

from .repository import BillingRepository


class BillingService:
    def __init__(self, db: Database):
        self.repo = BillingRepository(db)

    def get_pathologists_report(self, year: int, month: int) -> dict:
        return self.repo.get_pathologists_billing_report(year, month)

    def get_tests_report(self, year: int, month: int) -> dict:
        return self.repo.get_tests_billing_report(year, month)

    def get_test_detail(self, year: int, month: int, test_code: str) -> dict:
        return self.repo.get_test_billing_detail(year, month, test_code)
