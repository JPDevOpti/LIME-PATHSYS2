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

export interface DiseaseCountApiResponse {
    total: number;
    diseases_collection: number;
    cie10_collection: number;
    cieo_collection: number;
}

let canUseCountEndpoint = true;

function normalizeTable(value: string | undefined): 'CIE10' | 'CIEO' | '' {
    const normalized = String(value ?? '').trim().toUpperCase().replace(/[-\s]/g, '');
    if (normalized === 'CIE10') return 'CIE10';
    if (normalized === 'CIEO') return 'CIEO';
    return '';
}

function mapDiseases(res: DiseaseSearchApiResponse): Disease[] {
    return (res.diseases ?? []).map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        table: d.table,
    }));
}

export const diseaseService = {
    async count(): Promise<DiseaseCountApiResponse | null> {
        if (!canUseCountEndpoint) return null;
        try {
            return await apiClient.get<DiseaseCountApiResponse>('/api/v1/diseases/count', undefined, {
                suppressErrorLog: true,
            });
        } catch {
            canUseCountEndpoint = false;
            return null;
        }
    },

    async search(query: string, table: 'CIE10' | 'CIEO', limit = 100): Promise<Disease[]> {
        const res = await apiClient.get<DiseaseSearchApiResponse>('/api/v1/diseases/search', {
            q: query.trim(),
            table,
            skip: 0,
            limit,
        });

        console.log(`[DiseaseService][${table}] llegadas del back (con table): ${res.diseases?.length ?? 0}`);

        const primary = mapDiseases(res);
        if (primary.length > 0) return primary;

        const retry = await apiClient.get<DiseaseSearchApiResponse>('/api/v1/diseases/search', {
            q: query.trim(),
            skip: 0,
            limit,
        });

        console.log(`[DiseaseService][${table}] llegadas del back (sin table fallback): ${retry.diseases?.length ?? 0}`);

        const fallback = mapDiseases(retry);
        if (fallback.length === 0) return fallback;

        const filteredByTable = fallback.filter((d) => {
            const detected = normalizeTable(d.table);
            if (detected) return detected === table;
            return true;
        });

        return filteredByTable;
    },

    async create({ code, name, table }: { code: string; name: string; table: 'CIE10' | 'CIEO' }): Promise<Disease> {
        const res = await apiClient.post<Disease>('/api/v1/diseases/', {
            code,
            name,
            table,
        });
        return res;
    },
};
