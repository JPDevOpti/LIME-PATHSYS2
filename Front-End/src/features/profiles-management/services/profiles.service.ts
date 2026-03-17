import { apiClient } from '@/shared/api/client';
import type {
    Profile,
    CreateProfilePayload,
    UpdateProfilePayload,
} from '../types/profile.types';

const ROLE_TO_BACKEND: Record<string, string> = {
    administrador: 'administrator',
    admin: 'administrator',
    patologo: 'pathologist',
    residente: 'resident',
    recepcionista: 'auxiliar',
    recepcion: 'auxiliar',
    auxiliar: 'auxiliar',
    visitante: 'visitante',
    facturacion: 'visitante',
    paciente: 'paciente',
};

const ROLE_TO_FRONTEND: Record<string, string> = {
    administrator: 'administrador',
    pathologist: 'patologo',
    resident: 'residente',
    auxiliar: 'recepcionista',
    billing: 'visitante',
    visitante: 'visitante',
    paciente: 'paciente',
};

function mapApiToProfile(api: Record<string, unknown>): Profile {
    const role = String(api.role || '').trim().toLowerCase();
    return {
        id: String(api.id ?? ''),
        name: String(api.name ?? ''),
        code: api.code != null ? String(api.code) : undefined,
        email: api.email != null ? String(api.email) : undefined,
        document: api.document != null ? String(api.document) : undefined,
        initials: api.initials != null ? String(api.initials) : undefined,
        medicalLicense: api.medical_license != null ? String(api.medical_license) : undefined,
        observations: api.observations != null ? String(api.observations) : undefined,
        signature: api.signature != null ? String(api.signature) : undefined,
        role: (ROLE_TO_FRONTEND[role] || role) as Profile['role'],
        isActive: api.is_active !== false,
        createdAt: api.created_at != null ? String(api.created_at) : undefined,
        updatedAt: api.updated_at != null ? String(api.updated_at) : undefined,
    };
}

function buildCreateBody(payload: CreateProfilePayload): Record<string, unknown> {
    if (!payload.email?.trim()) throw new Error('El correo electronico es obligatorio');
    const body: Record<string, unknown> = {
        name: payload.name,
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        role: ROLE_TO_BACKEND[payload.role] || payload.role,
        is_active: payload.isActive !== false,
    };
    if (payload.code) body.code = payload.code;
    if (payload.document) body.document = payload.document;
    if (payload.initials) body.initials = payload.initials;
    if (payload.medicalLicense) body.medical_license = payload.medicalLicense;
    if (payload.observations) body.observations = payload.observations;
    return body;
}

function buildUpdateBody(payload: UpdateProfilePayload): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (payload.name != null) body.name = payload.name;
    if (payload.email != null) body.email = payload.email;
    if (payload.role != null) body.role = ROLE_TO_BACKEND[payload.role] || payload.role;
    if (payload.code !== undefined) body.code = payload.code || null;
    if (payload.document !== undefined) body.document = payload.document || null;
    if (payload.initials !== undefined) body.initials = payload.initials || null;
    if (payload.medicalLicense !== undefined) body.medical_license = payload.medicalLicense || null;
    if (payload.observations !== undefined) body.observations = payload.observations || null;
    if (payload.signature !== undefined) body.signature = payload.signature ?? '';
    if (payload.password?.trim()) body.password = payload.password;
    if (payload.isActive !== undefined) body.is_active = payload.isActive;
    return body;
}

export const profilesService = {
    async listProgressive(params?: {
        pageSize?: number;
        concurrency?: number;
        onChunk?: (chunk: Profile[], meta: { loaded: number; total: number }) => void;
    }): Promise<Profile[]> {
        const pageSize = Math.max(1, Math.min(1000, params?.pageSize ?? 500));
        const concurrency = Math.max(1, Math.min(6, params?.concurrency ?? 4));

        const first = await apiClient.get<{ data: unknown[]; total: number }>('/api/v1/users', {
            skip: 0,
            limit: pageSize,
        });
        const total = typeof first.total === 'number' ? first.total : (first.data || []).length;
        const all: Profile[] = (first.data || []).map((d) => mapApiToProfile(d as Record<string, unknown>));
        params?.onChunk?.(all, { loaded: all.length, total });

        const pages = Math.ceil(total / pageSize);
        const skips: number[] = [];
        for (let i = 1; i < pages; i++) skips.push(i * pageSize);

        let cursor = 0;
        const workers = Array.from({ length: Math.min(concurrency, skips.length) }, async () => {
            while (cursor < skips.length) {
                const myIndex = cursor;
                cursor += 1;
                const skip = skips[myIndex]!;
                const res = await apiClient.get<{ data: unknown[]; total: number }>('/api/v1/users', {
                    skip,
                    limit: pageSize,
                });
                const chunk = (res.data || []).map((d) => mapApiToProfile(d as Record<string, unknown>));
                if (chunk.length) {
                    all.push(...chunk);
                    params?.onChunk?.(chunk, { loaded: all.length, total });
                }
            }
        });

        await Promise.all(workers);
        return all;
    },

    async list(): Promise<Profile[]> {
        return this.listProgressive();
    },

    async get(id: string): Promise<Profile | null> {
        try {
            const api = await apiClient.get<Record<string, unknown>>(`/api/v1/users/${id}`);
            return mapApiToProfile(api);
        } catch {
            return null;
        }
    },

    async create(payload: CreateProfilePayload): Promise<Profile> {
        const body = buildCreateBody(payload);
        const api = await apiClient.post<Record<string, unknown>>('/api/v1/users', body);
        return mapApiToProfile(api);
    },

    async update(id: string, payload: UpdateProfilePayload): Promise<Profile> {
        const body = buildUpdateBody(payload);
        const api = await apiClient.put<Record<string, unknown>>(`/api/v1/users/${id}`, body);
        return mapApiToProfile(api);
    },

    async updateMyProfile(payload: UpdateProfilePayload): Promise<Profile> {
        const body = buildUpdateBody(payload);
        const api = await apiClient.put<Record<string, unknown>>('/api/v1/auth/profile', body);
        return mapApiToProfile(api);
    },
};
