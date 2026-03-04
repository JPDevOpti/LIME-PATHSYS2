import { apiClient } from '@/shared/api/client';

const FETCH_TIMEOUT_MS = 15000;

function fetchWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Tiempo de espera agotado. Verifique la conexión.')), timeoutMs)
        ),
    ]);
}

export interface PathologistForAssignment {
    id: string;
    name: string;
    email?: string;
    medical_registry?: string;
    is_active: boolean;
}

function mapApiToPathologist(raw: Record<string, unknown>): PathologistForAssignment {
    return {
        id: String(raw.id ?? ''),
        name: String(raw.name ?? ''),
        email: raw.email != null ? String(raw.email) : undefined,
        medical_registry: raw.medical_license != null ? String(raw.medical_license) : undefined,
        is_active: raw.is_active !== false,
    };
}

export const pathologistService = {
    async listPathologists(search?: string, includeInactive = false): Promise<PathologistForAssignment[]> {
        const params: Record<string, string | number | undefined> = { skip: 0, limit: 500 };
        if (search?.trim()) params.search = search.trim();
        if (!includeInactive) params.is_active = 'true';
        const res = await fetchWithTimeout(
            () =>
                apiClient.get<{ data: unknown[]; total: number }>(
                    '/api/v1/pathologists',
                    params
                ),
            FETCH_TIMEOUT_MS
        );
        return (res.data || []).map((d) => mapApiToPathologist(d as Record<string, unknown>));
    },
};
