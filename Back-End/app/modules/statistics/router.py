from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.modules.auth.dependencies import get_current_user

from .schemas import (
    EntitiesReportResponse,
    EntityDetailsResponse,
    OpportunityReportResponse,
    PathologistEntitiesResponse,
    PathologistPerformance,
    PathologistTestsResponse,
    TestsReportResponse,
)
from .service import StatisticsService

router = APIRouter()


def get_statistics_service(db=Depends(get_db)) -> StatisticsService:
    return StatisticsService(db)


# ── Catálogos ──────────────────────────────────────────────────────────────────

@router.get("/available-entities", response_model=List[str])
def get_available_entities(
    service: StatisticsService = Depends(get_statistics_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_available_entities()


@router.get("/available-pathologists", response_model=List[str])
def get_available_pathologists(
    service: StatisticsService = Depends(get_statistics_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_available_pathologists()


# ── Oportunidad general ────────────────────────────────────────────────────────

@router.get("/opportunity", response_model=OpportunityReportResponse)
def get_opportunity_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    entity: Optional[str] = Query(None),
    service: StatisticsService = Depends(get_statistics_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_opportunity_report(year, month, entity or None)


# ── Entidades ──────────────────────────────────────────────────────────────────

@router.get("/entities", response_model=EntitiesReportResponse)
def get_entities_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    service: StatisticsService = Depends(get_statistics_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_entities_report(year, month)


@router.get("/entities/{entity_name}/details", response_model=EntityDetailsResponse)
def get_entity_details(
    entity_name: str,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    service: StatisticsService = Depends(get_statistics_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_entity_details(entity_name, year, month)


# ── Pruebas ────────────────────────────────────────────────────────────────────

@router.get("/tests", response_model=TestsReportResponse)
def get_tests_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    entity: Optional[str] = Query(None),
    service: StatisticsService = Depends(get_statistics_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_tests_report(year, month, entity or None)


# ── Patólogos ──────────────────────────────────────────────────────────────────

@router.get("/pathologists", response_model=List[PathologistPerformance])
def get_pathologists_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    service: StatisticsService = Depends(get_statistics_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_pathologists_report(year, month)


@router.get("/pathologists/{pathologist_name}/entities", response_model=PathologistEntitiesResponse)
def get_pathologist_entities(
    pathologist_name: str,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    service: StatisticsService = Depends(get_statistics_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_pathologist_entities(pathologist_name, year, month)


@router.get("/pathologists/{pathologist_name}/tests", response_model=PathologistTestsResponse)
def get_pathologist_tests(
    pathologist_name: str,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    service: StatisticsService = Depends(get_statistics_service),
    current_user: dict = Depends(get_current_user),
):
    return service.get_pathologist_tests(pathologist_name, year, month)
