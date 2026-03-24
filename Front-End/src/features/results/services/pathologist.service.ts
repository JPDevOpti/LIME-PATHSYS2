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

let pathologistsCache: { data: PathologistForAssignment[]; timestamp: number } | null = null;
let pendingRequest: Promise<PathologistForAssignment[]> | null = null;

export const pathologistService = {
    async listPathologists(search?: string, includeInactive = false): Promise<PathologistForAssignment[]> {
        // Solo cachear si no hay búsqueda y no se incluyen inactivos (el caso más común)
        const isDefaultQuery = !search?.trim() && !includeInactive;
        
        if (isDefaultQuery && pathologistsCache && (Date.now() - pathologistsCache.timestamp < CACHE_DURATION_MS)) {
            return pathologistsCache.data;
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
                        '/api/v1/pathologists',
                        params
                    ),
                FETCH_TIMEOUT_MS
            );
            
            const data = (res.data || []).map((d) => mapApiToPathologist(d as Record<string, unknown>));
            
            if (isDefaultQuery) {
                pathologistsCache = { data, timestamp: Date.now() };
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
        pathologistsCache = null;
    }
};
