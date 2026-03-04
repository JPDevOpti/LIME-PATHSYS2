export interface BillingTestItem {
    codigo: string;
    nombre: string;
    cantidad: number;
    monto: number;
}

export interface BillingTestsReportData {
    tests: BillingTestItem[];
    total: number;
}

export interface BillingTestEntityDetail {
    entidad: string;
    cantidad: number;
    precio_unitario: number;
    monto: number;
    tiene_convenio: boolean;
}

export interface BillingTestDetail {
    codigo: string;
    nombre: string;
    total_cantidad: number;
    total_monto: number;
    detalles_por_entidad: BillingTestEntityDetail[];
}

export interface BillingPathologistItem {
    codigo: string;
    nombre: string;
    casos: number;
    monto: number;
}

export interface BillingPathologistReportData {
    pathologists: BillingPathologistItem[];
    total: number;
}
