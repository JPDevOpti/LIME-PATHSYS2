from pydantic import BaseModel


# ── Oportunidad general ────────────────────────────────────────────────────────

class OpportunityTestStat(BaseModel):
    code: str
    name: str
    withinOpportunity: int
    outOfOpportunity: int
    averageDays: float | None = None
    opportunityTimeDays: float | None = None


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
    averageDays: float | None = None
    patients: int | None = None
    total_last_month: int | None = 0
    percentage_change: float | None = 0.0


class OpportunityReportResponse(BaseModel):
    tests: list[OpportunityTestStat]
    pathologists: list[PathologistPerformance]
    monthlyPct: list[float] | None = None
    summary: OpportunitySummaryStats | None = None


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
    entities: list[EntityStat]
    summary: EntitiesReportSummary | None = None


class EntityTestDetail(BaseModel):
    codigo: str
    nombre: str | None = None
    total_solicitudes: int


class EntityPathologistDetail(BaseModel):
    name: str
    codigo: str
    casesCount: int


class EntityDetailsResponse(BaseModel):
    pruebas_mas_solicitadas: list[EntityTestDetail]
    pathologists: list[EntityPathologistDetail]


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
    tests: list[TestStat]
    summary: TestsReportSummary | None = None


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
    entidades: list[PathologistEntityDetail]


class PathologistTestsResponse(BaseModel):
    pruebas: list[PathologistTestDetail]
