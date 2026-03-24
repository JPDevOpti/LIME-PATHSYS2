import { apiClient } from '@/shared/api/client';

const FETCH_TIMEOUT_MS = 30000;
const CACHE_DURATION_MS = 60000; // 1 minuto de cache

function fetchWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Tiempo de espera agotado. Verifique la conexión.')), timeoutMs)
        ),
    ]);
}

export interface ResidentForAssignment {
    id: string;
    name: string;
    email?: string;
    code?: string;
    initials?: string;
    is_active: boolean;
}

function mapApiToResident(raw: Record<string, unknown>): ResidentForAssignment {
    return {
        id: String(raw.id ?? ''),
        name: String(raw.name ?? ''),
        email: raw.email != null ? String(raw.email) : undefined,
        code: raw.code != null ? String(raw.code) : undefined,
        initials: raw.initials != null ? String(raw.initials) : undefined,
        is_active: raw.is_active !== false,
    };
}

let residentsCache: { data: ResidentForAssignment[]; timestamp: number } | null = null;
let pendingRequest: Promise<ResidentForAssignment[]> | null = null;

export const residentService = {
    async listResidents(search?: string, includeInactive = false): Promise<ResidentForAssignment[]> {
        const isDefaultQuery = !search?.trim() && !includeInactive;

        if (isDefaultQuery && residentsCache && (Date.now() - residentsCache.timestamp < CACHE_DURATION_MS)) {
            return residentsCache.data;
        }

        if (isDefaultQuery && pendingRequest) {
            return pendingRequest;
        }

        const fetchFn = async () => {
            const params: Record<string, string | number | undefined> = { skip: 0, limit: 500 };
            if (search?.trim()) params.search = search.trim();
            if (!includeInactive) params.is_active = 'true';
            
            const res = await fetchWithTimeout(
                () =>
                    apiClient.get<{ data: unknown[]; total: number }>(
                        '/api/v1/residents',
                        params
                    ),
                FETCH_TIMEOUT_MS
            );
            
            const data = (res.data || []).map((d) => mapApiToResident(d as Record<string, unknown>));
            
            if (isDefaultQuery) {
                residentsCache = { data, timestamp: Date.now() };
                pendingRequest = null;
            }
            
            return data;
        };

        if (isDefaultQuery) {
            pendingRequest = fetchFn();
            return pendingRequest;
        }

        return fetchFn();
    },

    clearCache() {
        residentsCache = null;
    }
};
