import { apiClient } from '@/shared/api/client';

export interface Disease {
    id: string;
    code: string;
    name: string;
    table: string;
}

interface DiseaseSearchApiResponse {
    diseases: Array<{ id: string; code: string; name: string; table: string }>;
}

export const diseaseService = {
    async search(query: string, table: 'CIE10' | 'CIEO', limit = 100): Promise<Disease[]> {
        const res = await apiClient.get<DiseaseSearchApiResponse>('/api/v1/diseases/search', {
            q: query.trim(),
            table,
            skip: 0,
            limit,
        });
        return (res.diseases ?? []).map((d) => ({
            id: d.id,
            code: d.code,
            name: d.name,
            table: d.table,
        }));
    },

    async create({ code, name, table }: { code: string; name: string; table: 'CIE10' | 'CIEO' }): Promise<Disease> {
        const res = await apiClient.post<Disease>('/api/v1/diseases', {
            code,
            name,
            table,
        });
        return res;
    },
};
