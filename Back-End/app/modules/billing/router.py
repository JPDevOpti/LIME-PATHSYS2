from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from app.database import get_db
from app.modules.auth.dependencies import get_current_user_id
from .schemas import BillingPathologistReportData, BillingTestsReportData, BillingTestDetail
from .service import BillingService

billing_router = APIRouter()


@billing_router.get("/pathologists", response_model=BillingPathologistReportData)
def get_pathologists_report(
    year: int = Query(...),
    month: int = Query(..., ge=0, le=11),
    db: Database = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    return BillingService(db).get_pathologists_report(year, month + 1)


@billing_router.get("/tests", response_model=BillingTestsReportData)
def get_tests_report(
    year: int = Query(...),
    month: int = Query(..., ge=0, le=11),
    db: Database = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    return BillingService(db).get_tests_report(year, month + 1)


@billing_router.get("/tests/{test_code}", response_model=BillingTestDetail)
def get_test_detail(
    test_code: str,
    year: int = Query(...),
    month: int = Query(..., ge=0, le=11),
    db: Database = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    return BillingService(db).get_test_detail(year, month + 1, test_code)
