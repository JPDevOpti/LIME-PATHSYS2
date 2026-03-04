from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MetricDetail(BaseModel):
    mes_actual: int
    mes_anterior: int
    cambio_porcentual: float

class DashboardMetrics(BaseModel):
    pacientes: MetricDetail
    casos: MetricDetail

class MonthlyCasesData(BaseModel):
    datos: List[int]
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
    total_casos_mes_anterior: int
    mes_anterior: OpportunityStatsMonth

class UrgentCasePatient(BaseModel):
    nombre: str
    cedula: str
    entidad: Optional[str] = None

class UrgentCase(BaseModel):
    id: str
    codigo: str
    paciente: UrgentCasePatient
    pruebas: List[str]
    patologo: str
    fecha_creacion: str
    estado: str
    prioridad: str
    dias_en_sistema: int
    tiempo_oportunidad_max: Optional[int] = None
