import { apiClient } from '@/shared/api/client';
import type {
    LabTest,
    CreateTestRequest,
    UpdateTestRequest,
    TestAgreement,
} from '../types/lab-tests.types';

function mapApiToTest(api: Record<string, unknown>): LabTest {
    return {
        id: String(api.id ?? ''),
        test_code: String(api.test_code ?? ''),
        name: String(api.name ?? ''),
        description: api.description != null ? String(api.description) : '',
        time: Number(api.time ?? 1),
        price: Number(api.price ?? 0),
        is_active: api.is_active !== false,
        agreements: (api.agreements as TestAgreement[]) || [],
        created_at: api.created_at != null ? String(api.created_at) : '',
        updated_at: api.updated_at != null ? String(api.updated_at) : undefined,
    };
}

function buildCreateBody(data: CreateTestRequest): Record<string, unknown> {
    return {
        test_code: data.test_code.trim().toUpperCase(),
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        time: data.time,
        price: data.price,
        is_active: data.is_active ?? true,
        agreements: data.agreements || [],
    };
}

function buildUpdateBody(data: UpdateTestRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (data.test_code != null) body.test_code = data.test_code.trim().toUpperCase();
    if (data.name != null) body.name = data.name.trim();
    if (data.description !== undefined) body.description = data.description?.trim() || null;
    if (data.time != null) body.time = data.time;
    if (data.price !== undefined) body.price = data.price;
    if (data.is_active !== undefined) body.is_active = data.is_active;
    if (data.agreements !== undefined) body.agreements = data.agreements;
    return body;
}

export const labTestsService = {
    async getAll(includeInactive = true): Promise<LabTest[]> {
        const params: Record<string, string | number> = { limit: 500 };
        if (!includeInactive) params.is_active = 'true';
        const res = await apiClient.get<{ data: unknown[]; total: number }>('/api/v1/tests', params);
        return (res.data || []).map((d) => mapApiToTest(d as Record<string, unknown>));
    },

    async create(data: CreateTestRequest): Promise<LabTest> {
        const body = buildCreateBody(data);
        const api = await apiClient.post<Record<string, unknown>>('/api/v1/tests', body);
        return mapApiToTest(api);
    },

    async getByCode(code: string): Promise<LabTest | null> {
        try {
            const api = await apiClient.get<Record<string, unknown>>(
                `/api/v1/tests/${encodeURIComponent(code.trim().toUpperCase())}`
            );
            return mapApiToTest(api);
        } catch {
            return null;
        }
    },

    async update(originalCode: string, data: UpdateTestRequest): Promise<LabTest> {
        const body = buildUpdateBody(data);
        const code = originalCode.trim().toUpperCase();
        const api = await apiClient.put<Record<string, unknown>>(
            `/api/v1/tests/${encodeURIComponent(code)}`,
            body
        );
        return mapApiToTest(api);
    },

    async checkCodeExists(code: string, excludeCode?: string): Promise<boolean> {
        const normalized = code.trim().toUpperCase();
        if (excludeCode && excludeCode.trim().toUpperCase() === normalized) return false;
        try {
            await apiClient.get<Record<string, unknown>>(
                `/api/v1/tests/${encodeURIComponent(normalized)}`
            );
            return true;
        } catch {
            return false;
        }
    },
};
