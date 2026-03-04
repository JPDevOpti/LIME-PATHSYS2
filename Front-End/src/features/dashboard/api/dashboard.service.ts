import { apiClient } from '@/shared/api/client';
import type {
    DashboardMetrics,
    MonthlyCasesData,
    EstadisticasOportunidad,
    CasoUrgente
} from '../model/dashboard.types';

const API_BASE = '/api/v1/dashboard';

export const dashboardService = {
    async getMetrics(): Promise<DashboardMetrics> {
        return apiClient.get<DashboardMetrics>(`${API_BASE}/metrics`);
    },

    async getMonthlyCases(): Promise<MonthlyCasesData> {
        return apiClient.get<MonthlyCasesData>(`${API_BASE}/monthly-cases`);
    },

    async getOpportunityStats(): Promise<EstadisticasOportunidad> {
        return apiClient.get<EstadisticasOportunidad>(`${API_BASE}/opportunity-stats`);
    },

    async getUrgentCases(limit: number = 10): Promise<CasoUrgente[]> {
        return apiClient.get<CasoUrgente[]>(`${API_BASE}/urgent-cases`, { limit });
    }
};
