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
    pruebas_mas_solicitadas: Array<{
        codigo: string;
        nombre?: string;
        total_solicitudes: number;
    }>;
    pathologists: Array<{
        name: string;
        codigo: string;
        casesCount: number;
    }>;
}
