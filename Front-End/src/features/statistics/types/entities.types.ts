export interface EntityStats {
    nombre: string;
    codigo: string;
    ambulatorios: number;
    hospitalizados: number;
    total: number;
    dentroOportunidad: number;
    fueraOportunidad: number;
    tiempoPromedio: number;
}

export interface EntitiesReportData {
    entities: EntityStats[];
    summary?: {
        total: number;
        ambulatorios: number;
        hospitalizados: number;
        tiempoPromedio: number;
    };
}

export interface PeriodSelection {
    month: number;
    year: number;
}

export interface EntityDetails {
    estadisticas_basicas: {
        total_casos: number;
        ambulatorios: number;
        hospitalizados: number;
        promedio_muestras_por_caso: number;
    };
    tiempos_procesamiento: {
        promedio_dias: number;
        minimo_dias: number;
        maximo_dias: number;
        muestras_completadas: number;
    };
    pruebas_mas_solicitadas: Array<{
        codigo: string;
        nombre?: string;
        total_solicitudes: number;
    }>;
}
