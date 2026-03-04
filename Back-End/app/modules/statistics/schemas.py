from typing import List, Optional
from pydantic import BaseModel


# ── Oportunidad general ────────────────────────────────────────────────────────

class OpportunityTestStat(BaseModel):
    code: str
    name: str
    withinOpportunity: int
    outOfOpportunity: int
    averageDays: Optional[float] = None
    opportunityTimeDays: Optional[float] = None


class PathologistPerformance(BaseModel):
    code: str
    name: str
    withinOpportunity: int
    outOfOpportunity: int
    avgTime: float


class OpportunitySummaryStats(BaseModel):
    total: int
    within: int
    out: int
    averageDays: Optional[float] = None
    patients: Optional[int] = None
    total_last_month: Optional[int] = 0
    percentage_change: Optional[float] = 0.0


class OpportunityReportResponse(BaseModel):
    tests: List[OpportunityTestStat]
    pathologists: List[PathologistPerformance]
    monthlyPct: Optional[List[float]] = None
    summary: Optional[OpportunitySummaryStats] = None


# ── Entidades ──────────────────────────────────────────────────────────────────

class EntityStat(BaseModel):
    nombre: str
    codigo: str
    ambulatorios: int
    hospitalizados: int
    total: int
    dentroOportunidad: int
    fueraOportunidad: int
    tiempoPromedio: float


class EntitiesReportSummary(BaseModel):
    total: int
    ambulatorios: int
    hospitalizados: int
    tiempoPromedio: float


class EntitiesReportResponse(BaseModel):
    entities: List[EntityStat]
    summary: Optional[EntitiesReportSummary] = None


class EntityTestDetail(BaseModel):
    codigo: str
    nombre: Optional[str] = None
    total_solicitudes: int


class EntityPathologistDetail(BaseModel):
    name: str
    codigo: str
    casesCount: int


class EntityDetailsResponse(BaseModel):
    pruebas_mas_solicitadas: List[EntityTestDetail]
    pathologists: List[EntityPathologistDetail]


# ── Pruebas ────────────────────────────────────────────────────────────────────

class TestStat(BaseModel):
    codigo: str
    nombre: str
    ambulatorios: int
    hospitalizados: int
    total: int


class TestsReportSummary(BaseModel):
    total: int
    ambulatorios: int
    hospitalizados: int


class TestsReportResponse(BaseModel):
    tests: List[TestStat]
    summary: Optional[TestsReportSummary] = None


# ── Patólogos ──────────────────────────────────────────────────────────────────

class PathologistEntityDetail(BaseModel):
    name: str
    codigo: str
    casesCount: int


class PathologistTestDetail(BaseModel):
    name: str
    codigo: str
    count: int


class PathologistEntitiesResponse(BaseModel):
    entidades: List[PathologistEntityDetail]


class PathologistTestsResponse(BaseModel):
    pruebas: List[PathologistTestDetail]
