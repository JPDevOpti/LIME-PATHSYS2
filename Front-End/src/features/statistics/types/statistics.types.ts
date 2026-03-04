export interface EstadisticasOportunidad {
    porcentaje_oportunidad: number;
    cambio_porcentual: number;
    tiempo_promedio: number;
    casos_dentro_oportunidad: number;
    casos_fuera_oportunidad: number;
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
    total: number;
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
    summary?: OpportunitySummaryStats;
}
