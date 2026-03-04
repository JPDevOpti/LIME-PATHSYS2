from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.modules.auth.dependencies import get_current_user

from .schemas import DashboardMetrics, MonthlyCasesData, OpportunityStats, UrgentCase
from .service import DashboardService

router = APIRouter()

_PATHOLOGIST_ROLES = {"patologo", "pathologist"}


def get_dashboard_service(db=Depends(get_db)) -> DashboardService:
    return DashboardService(db)


def _resolve_pathologist(
    pathologist_name: str | None, current_user: dict
) -> str | None:
    """Si el usuario es patólogo, acota las consultas a su propio nombre."""
    if current_user.get("role", "").lower() in _PATHOLOGIST_ROLES:
        return current_user.get("name")
    return pathologist_name


@router.get("/metrics", response_model=DashboardMetrics)
def get_metrics(
    pathologist_name: str | None = Query(None),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_metrics(_resolve_pathologist(pathologist_name, current_user))


@router.get("/monthly-cases", response_model=MonthlyCasesData)
def get_monthly_cases(
    pathologist_name: str | None = Query(None),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_monthly_cases_data(
        _resolve_pathologist(pathologist_name, current_user)
    )


@router.get("/urgent-cases", response_model=list[UrgentCase])
def get_urgent_cases(
    pathologist_name: str | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_urgent_cases(
        _resolve_pathologist(pathologist_name, current_user), limit
    )


@router.get("/opportunity-stats", response_model=OpportunityStats)
def get_opportunity_stats(
    pathologist_name: str | None = Query(None),
    service: DashboardService = Depends(get_dashboard_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_opportunity_stats(
        _resolve_pathologist(pathologist_name, current_user)
    )
