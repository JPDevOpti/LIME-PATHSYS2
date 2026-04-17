/** Forma mínima de la respuesta de oportunidad (dashboard u otros módulos). */
export type OpportunityStatsLike = {
    casos_dentro_oportunidad: number;
    casos_fuera_oportunidad: number;
    total_casos_periodo?: number;
    casos_sin_evaluacion_oportunidad?: number;
};

/**
 * Total de casos del periodo para la tarjeta. Acepta snake_case o camelCase en JSON crudo.
 */
export function getOpportunityStatsTotalCasos(data: OpportunityStatsLike): number {
    const raw = data as Record<string, unknown>;
    const explicit = raw.total_casos_periodo ?? raw.totalCasosPeriodo;
    if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit >= 0) {
        return explicit;
    }
    const sinRaw = raw.casos_sin_evaluacion_oportunidad ?? raw.casosSinEvaluacionOportunidad;
    if (typeof sinRaw === 'number' && Number.isFinite(sinRaw) && sinRaw >= 0) {
        return data.casos_dentro_oportunidad + data.casos_fuera_oportunidad + sinRaw;
    }
    return data.casos_dentro_oportunidad + data.casos_fuera_oportunidad;
}

export function getOpportunityStatsSinEvaluacion(data: OpportunityStatsLike): number {
    const raw = data as Record<string, unknown>;
    const sinRaw = raw.casos_sin_evaluacion_oportunidad ?? raw.casosSinEvaluacionOportunidad;
    if (typeof sinRaw === 'number' && Number.isFinite(sinRaw) && sinRaw >= 0) {
        return sinRaw;
    }
    const total = getOpportunityStatsTotalCasos(data);
    const sum = data.casos_dentro_oportunidad + data.casos_fuera_oportunidad;
    return Math.max(0, total - sum);
}
