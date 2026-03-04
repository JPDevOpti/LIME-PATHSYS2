from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.modules.auth.dependencies import get_current_user

from .schemas import DashboardMetrics, MonthlyCasesData, OpportunityStats, UrgentCase
from .service import DashboardService

router = APIRouter()


def get_dashboard_service(db=Depends(get_db)) -> DashboardService:
    return DashboardService(db)


@router.get("/metrics", response_model=DashboardMetrics)
def get_metrics(
    pathologist_name: Optional[str] = Query(None),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: dict = Depends(get_current_user),
):
    role = current_user.get("role", "").lower()
    if role in ["patologo", "pathologist"]:
        pathologist_name = current_user.get("name")
    return service.get_metrics(pathologist_name)


@router.get("/monthly-cases", response_model=MonthlyCasesData)
def get_monthly_cases(
    pathologist_name: Optional[str] = Query(None),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: dict = Depends(get_current_user),
):
    role = current_user.get("role", "").lower()
    if role in ["patologo", "pathologist"]:
        pathologist_name = current_user.get("name")
    return service.get_monthly_cases_data(pathologist_name)


@router.get("/urgent-cases", response_model=List[UrgentCase])
def get_urgent_cases(
    pathologist_name: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: dict = Depends(get_current_user),
):
    # If user is pathologist, filter by their name
    role = current_user.get("role", "").lower()
    if role in ["patologo", "pathologist"]:
        pathologist_name = current_user.get("name")

    return service.get_urgent_cases(pathologist_name, limit)


@router.get("/opportunity-stats", response_model=OpportunityStats)
def get_opportunity_stats(
    pathologist_name: Optional[str] = Query(None),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: dict = Depends(get_current_user),
):
    role = current_user.get("role", "").lower()
    if role in ["patologo", "pathologist"]:
        pathologist_name = current_user.get("name")
    return service.get_opportunity_stats(pathologist_name)
