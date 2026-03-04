from fastapi import APIRouter, Depends, Query
from app.database import get_db
from pymongo.database import Database
from .service import BillingService
from .schemas import BillingPathologistReportData, BillingTestsReportData, BillingTestDetail

billing_router = APIRouter()

@billing_router.get("/pathologists", response_model=BillingPathologistReportData)
def get_pathologists_report(
    year: int = Query(...),
    month: int = Query(...),
    db: Database = Depends(get_db)
):
    service = BillingService(db)
    return service.get_pathologists_report(year, month + 1)

@billing_router.get("/tests", response_model=BillingTestsReportData)
def get_tests_report(
    year: int = Query(...),
    month: int = Query(...),
    db: Database = Depends(get_db)
):
    service = BillingService(db)
    return service.get_tests_report(year, month + 1)

@billing_router.get("/tests/{test_code}", response_model=BillingTestDetail)
def get_test_detail(
    test_code: str,
    year: int = Query(...),
    month: int = Query(...),
    db: Database = Depends(get_db)
):
    service = BillingService(db)
    return service.get_test_detail(year, month + 1, test_code)
