import { apiClient } from '@/shared/api/client';
import type {
    OpportunityReportData,
    OpportunityTest,
    PathologistPerformance,
    OpportunitySummaryStats,
    TestStats,
} from '../types/statistics.types';
import type {
    EntityStats,
    EntitiesReportData,
    EntityDetails,
    PeriodSelection,
} from '../types/entities.types';

const BASE = '/api/v1/statistics';

// ── Tipos de respuesta crudos del backend ─────────────────────────────────────

interface BackendOpportunityReport {
    tests: OpportunityTest[];
    pathologists: PathologistPerformance[];
    monthlyPct: number[] | null;
    summary: OpportunitySummaryStats | null;
}

interface BackendEntitiesReport {
    entities: EntityStats[];
    summary: {
        total: number;
        ambulatorios: number;
        hospitalizados: number;
        tiempoPromedio: number;
    } | null;
}

interface BackendEntityDetails {
    pruebas_mas_solicitadas: Array<{
        codigo: string;
        nombre?: string;
        total_solicitudes: number;
    }>;
    pathologists: Array<{ name: string; codigo: string; casesCount: number }>;
}

interface BackendTestsReport {
    tests: TestStats[];
    summary: { total: number; ambulatorios: number; hospitalizados: number } | null;
}

interface BackendPathologistEntities {
    entidades: Array<{ name: string; codigo: string; casesCount: number }>;
}

interface BackendPathologistTests {
    pruebas: Array<{ name: string; codigo: string; count: number }>;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const statisticsService = {
    async getOpportunityReport(
        month: number,
        year: number,
        entity?: string,
    ): Promise<OpportunityReportData> {
        const params: Record<string, string | number | undefined> = { month, year };
        if (entity) params.entity = entity;
        const data = await apiClient.get<BackendOpportunityReport>(`${BASE}/opportunity`, params);
        return {
            tests: data.tests,
            pathologists: data.pathologists,
            monthlyPct: data.monthlyPct ?? undefined,
            summary: data.summary ?? undefined,
        };
    },

    async getEntitiesReport(month: number, year: number): Promise<EntitiesReportData> {
        const data = await apiClient.get<BackendEntitiesReport>(`${BASE}/entities`, { month, year });
        return {
            entities: data.entities,
            summary: data.summary ?? undefined,
        };
    },

    async getEntityDetails(
        entityName: string,
        period: PeriodSelection,
    ): Promise<EntityDetails> {
        const data = await apiClient.get<BackendEntityDetails>(
            `${BASE}/entities/${encodeURIComponent(entityName)}/details`,
            { month: period.month, year: period.year },
        );
        return {
            estadisticas_basicas: {
                total_casos: 0,
                ambulatorios: 0,
                hospitalizados: 0,
                promedio_muestras_por_caso: 0,
            },
            tiempos_procesamiento: {
                promedio_dias: 0,
                minimo_dias: 0,
                maximo_dias: 0,
                muestras_completadas: 0,
            },
            pruebas_mas_solicitadas: data.pruebas_mas_solicitadas,
        };
    },

    async getEntityPathologists(
        entityName: string,
        period: PeriodSelection,
    ): Promise<Array<{ name: string; codigo: string; casesCount: number }>> {
        const data = await apiClient.get<BackendEntityDetails>(
            `${BASE}/entities/${encodeURIComponent(entityName)}/details`,
            { month: period.month, year: period.year },
        );
        return data.pathologists;
    },

    async getTestsReport(
        month: number,
        year: number,
        entity?: string,
    ): Promise<{ tests: TestStats[]; summary?: { total: number; ambulatorios: number; hospitalizados: number } }> {
        const params: Record<string, string | number | undefined> = { month, year };
        if (entity) params.entity = entity;
        const data = await apiClient.get<BackendTestsReport>(`${BASE}/tests`, params);
        return {
            tests: data.tests,
            summary: data.summary ?? undefined,
        };
    },

    async getPathologistsReport(month: number, year: number): Promise<PathologistPerformance[]> {
        return apiClient.get<PathologistPerformance[]>(`${BASE}/pathologists`, { month, year });
    },

    async getPathologistEntities(
        pathologistName: string,
        month: number,
        year: number,
    ): Promise<BackendPathologistEntities> {
        return apiClient.get<BackendPathologistEntities>(
            `${BASE}/pathologists/${encodeURIComponent(pathologistName)}/entities`,
            { month, year },
        );
    },

    async getPathologistTests(
        pathologistName: string,
        month: number,
        year: number,
    ): Promise<BackendPathologistTests> {
        return apiClient.get<BackendPathologistTests>(
            `${BASE}/pathologists/${encodeURIComponent(pathologistName)}/tests`,
            { month, year },
        );
    },

    async getAvailableEntities(): Promise<string[]> {
        return apiClient.get<string[]>(`${BASE}/available-entities`);
    },

    async getAvailablePathologists(): Promise<string[]> {
        return apiClient.get<string[]>(`${BASE}/available-pathologists`);
    },
};
