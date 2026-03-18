import { apiClient } from '@/shared/api/client';
import type {
    Entity,
    CreateEntityRequest,
    UpdateEntityRequest,
} from '../types/entity.types';

function mapApiToEntity(api: Record<string, unknown>): Entity {
    return {
        id: String(api.id ?? ''),
        name: String(api.name ?? ''),
        code: String(api.code ?? ''),
        observations: api.observations != null ? String(api.observations) : undefined,
        is_active: api.is_active !== false,
        created_at: api.created_at != null ? String(api.created_at) : '',
        updated_at: api.updated_at != null ? String(api.updated_at) : undefined,
    };
}

function buildCreateBody(data: CreateEntityRequest): Record<string, unknown> {
    return {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        observations: data.observations?.trim() || undefined,
        is_active: data.is_active ?? true,
    };
}

function buildUpdateBody(data: UpdateEntityRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (data.code != null) body.code = data.code.trim().toUpperCase();
    if (data.name != null) body.name = data.name.trim();
    if (data.observations !== undefined) body.observations = data.observations?.trim() || null;
    if (data.is_active !== undefined) body.is_active = data.is_active;
    return body;
}

export const entitiesService = {
    async getAll(includeInactive = true): Promise<Entity[]> {
        const params: Record<string, string | number> = { limit: 500 };
        if (!includeInactive) params.is_active = 'true';
        const res = await apiClient.get<{ data: unknown[]; total: number }>('/api/v1/entities', params);
        return (res.data || []).map((d) => mapApiToEntity(d as Record<string, unknown>));
    },

    async create(data: CreateEntityRequest): Promise<Entity> {
        const body = buildCreateBody(data);
        const api = await apiClient.post<Record<string, unknown>>('/api/v1/entities', body);
        return mapApiToEntity(api);
    },

    async getByCode(code: string): Promise<Entity | null> {
        try {
            const api = await apiClient.get<Record<string, unknown>>(
                `/api/v1/entities/${encodeURIComponent(code.trim().toUpperCase())}`
            );
            return mapApiToEntity(api);
        } catch {
            return null;
        }
    },

    async update(originalCode: string, data: UpdateEntityRequest): Promise<Entity> {
        const body = buildUpdateBody(data);
        const code = originalCode.trim().toUpperCase();
        const api = await apiClient.put<Record<string, unknown>>(
            `/api/v1/entities/${encodeURIComponent(code)}`,
            body
        );
        return mapApiToEntity(api);
    },

    async checkCodeExists(code: string, excludeCode?: string): Promise<boolean> {
        const normalized = code.trim().toUpperCase();
        if (excludeCode && excludeCode.trim().toUpperCase() === normalized) return false;
        try {
            await apiClient.get<Record<string, unknown>>(
                `/api/v1/entities/${encodeURIComponent(normalized)}`
            );
            return true;
        } catch {
            return false;
        }
    },
};
