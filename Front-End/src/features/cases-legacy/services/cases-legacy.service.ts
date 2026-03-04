import { apiClient } from '@/shared/lib/api';
import { LegacyCase, LegacyCaseFilters, LegacyCaseListResponse } from '../types/case-legacy.types';

const API_BASE = '/api/v1/cases-legacy';

export const legacyCasesService = {
    async getCases(filters?: LegacyCaseFilters): Promise<LegacyCaseListResponse> {
        const params: Record<string, string | number | undefined> = {
            skip: filters?.skip ?? 0,
            limit: filters?.limit ?? 25
        };

        if (filters?.search) params.search = filters.search;
        if (filters?.entity) params.entity = filters.entity;
        if (filters?.received_from) params.received_from = filters.received_from;
        if (filters?.received_to) params.received_to = filters.received_to;

        const res = await apiClient.get<LegacyCaseListResponse>(API_BASE, params);
        return res;
    },

    async getCaseById(id: string): Promise<LegacyCase | null> {
        try {
            const res = await apiClient.get<LegacyCase>(`${API_BASE}/${id}`);
            return res;
        } catch {
            return null;
        }
    },

    async getAvailableEntities(): Promise<string[]> {
        try {
            const res = await apiClient.get<string[]>(`${API_BASE}/available-entities`);
            return res;
        } catch {
            return [];
        }
    },

    async downloadPdf(id: string): Promise<Blob | null> {
        try {
            const response = await apiClient.get<Blob>(`${API_BASE}/${id}/pdf`, undefined, {
                responseType: 'blob'
            });
            return response;
        } catch (error) {
            console.error('Error downloading PDF:', error);
            return null;
        }
    }
};
