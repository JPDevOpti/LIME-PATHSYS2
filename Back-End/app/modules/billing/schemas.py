from pydantic import BaseModel


class BillingPathologistItem(BaseModel):
    codigo: str
    nombre: str
    casos: int
    monto: float


class BillingPathologistReportData(BaseModel):
    pathologists: list[BillingPathologistItem]
    total: float


class BillingTestItem(BaseModel):
    codigo: str
    nombre: str
    cantidad: int
    monto: float


class BillingTestsReportData(BaseModel):
    tests: list[BillingTestItem]
    total: float


class BillingTestEntityDetail(BaseModel):
    entidad: str
    cantidad: int
    precio_unitario: float
    monto: float
    tiene_convenio: bool


class BillingTestDetail(BaseModel):
    codigo: str
    nombre: str
    total_cantidad: int
    total_monto: float
    detalles_por_entidad: list[BillingTestEntityDetail]
