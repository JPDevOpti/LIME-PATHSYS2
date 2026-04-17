from pydantic import BaseModel


class MetricDetail(BaseModel):
    mes_actual: int
    mes_anterior: int
    cambio_porcentual: float


class DashboardMetrics(BaseModel):
    pacientes: MetricDetail
    casos: MetricDetail


class MonthlyCasesData(BaseModel):
    datos: list[int]
    total: int
    año: int


class OpportunityStatsMonth(BaseModel):
    nombre: str
    inicio: str
    fin: str


class OpportunityStats(BaseModel):
    porcentaje_oportunidad: float
    cambio_porcentual: float
    tiempo_promedio: float
    casos_dentro_oportunidad: int
    casos_fuera_oportunidad: int
    total_casos_periodo: int
    casos_sin_evaluacion_oportunidad: int
    total_casos_mes_anterior: int
    mes_anterior: OpportunityStatsMonth


class UrgentCasePatient(BaseModel):
    nombre: str
    cedula: str
    entidad: str | None = None


class UrgentCase(BaseModel):
    id: str
    codigo: str
    paciente: UrgentCasePatient
    pruebas: list[str]
    patologo: str
    fecha_creacion: str
    estado: str
    prioridad: str
    dias_en_sistema: int
    tiempo_oportunidad_max: int | None = None
