export interface EstadisticasOportunidad {
    porcentaje_oportunidad: number;
    cambio_porcentual: number;
    tiempo_promedio: number;
    casos_dentro_oportunidad: number;
    casos_fuera_oportunidad: number;
    total_casos_periodo?: number;
    casos_sin_evaluacion_oportunidad?: number;
    total_casos_mes_anterior: number;
    mes_anterior: {
        nombre: string;
        inicio: string;
        fin: string;
    };
}

export interface OpportunityTest {
    code: string;
    name: string;
    /** Unidades de prueba: suma de `quantity` por línea en muestras (incluye repeticiones). */
    totalProcedures: number;
    withinOpportunity: number;
    outOfOpportunity: number;
    averageDays?: number;
    opportunityTimeDays?: number;
}

export interface TestStats {
    codigo: string;
    nombre: string;
    ambulatorios: number;
    hospitalizados: number;
    /** Total de unidades de esta prueba (quantity por línea; varias muestras suman). */
    total: number;
}

export interface TestsReportSummaryStats {
    total: number;
    ambulatorios: number;
    hospitalizados: number;
    /** Casos completados en la cohorte del informe (sin duplicar por prueba). */
    casos_completados_periodo?: number;
}

export interface PathologistPerformance {
    code: string;
    name: string;
    withinOpportunity: number;
    outOfOpportunity: number;
    avgTime: number;
}

export interface OpportunitySummaryStats {
    total: number;
    within: number;
    out: number;
    averageDays?: number;
    patients?: number;
    total_last_month?: number;
    percentage_change?: number;
}

export interface OpportunityReportData {
    tests: OpportunityTest[];
    pathologists: PathologistPerformance[];
    monthlyPct?: number[];
    monthlyCases?: number[];
    monthlyPatients?: number[];
    summary?: OpportunitySummaryStats;
}
