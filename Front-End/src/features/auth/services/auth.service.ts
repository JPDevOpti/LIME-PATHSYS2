import { apiClient } from '@/shared/api/client';
import type { LoginRequest, LoginResponse, User } from '../types/auth.types';

const AUTH_BASE = '/api/v1/auth';

export const ROLE_NORMALIZE: Record<string, User['role']> = {
  administrator: 'administrator',
  admin: 'administrator',
  pathologist: 'pathologist',
  patologo: 'pathologist',
  resident: 'resident',
  residente: 'resident',
  auxiliar: 'recepcionista',
  recepcion: 'recepcionista',
  recepcionista: 'recepcionista',
  receptionist: 'recepcionista',
  billing: 'visitante',
  visitante: 'visitante',
  paciente: 'paciente',
};

export function normalizeRole(raw: unknown): User['role'] {
  const key = String(raw ?? '').trim().toLowerCase();
  return ROLE_NORMALIZE[key] ?? 'visitante';
}

function mapUser(raw: Record<string, unknown>): User {
  return {
    id: String(raw.id ?? ''),
    email: String(raw.email ?? ''),
    name: raw.name as string | undefined,
    role: normalizeRole(raw.role),
    is_active: Boolean(raw.is_active ?? true),
    administrator_code: raw.administrator_code as string | undefined,
    pathologist_code: raw.pathologist_code as string | undefined,
    resident_code: raw.resident_code as string | undefined,
    associated_entities: raw.associated_entities as User['associated_entities'],
    medical_license: raw.medical_license as string | undefined,
    initials: raw.initials as string | undefined,
    signature: raw.signature as string | undefined,
    observations: raw.observations as string | undefined,
    patient_id: raw.patient_id as string | undefined,
    document: raw.document as string | undefined,
  };
}

const AUTH_ERROR_MSG =
  'Correo o contraseña incorrectos. Verifique sus credenciales e intente de nuevo.';
const NETWORK_ERROR_MSG =
  'No se pudo conectar. Verifique su conexión e intente de nuevo.';

function toLoginError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes('invalid') ||
    lower.includes('credentials') ||
    lower.includes('401') ||
    lower.includes('unauthorized')
  ) {
    return new Error(AUTH_ERROR_MSG);
  }
  if (
    lower.includes('fetch') ||
    lower.includes('network') ||
    lower.includes('connection') ||
    lower.includes('failed to fetch')
  ) {
    return new Error(NETWORK_ERROR_MSG);
  }
  return new Error(msg || AUTH_ERROR_MSG);
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const data = await apiClient.post<{
        token: { access_token: string; token_type?: string; expires_in?: number };
        user: Record<string, unknown>;
      }>(`${AUTH_BASE}/login`, {
        email: credentials.email,
        password: credentials.password,
        remember_me: credentials.remember_me ?? false,
      });
      const token = data.token || {};
      const user = mapUser(data.user || {});
      return {
        access_token: token.access_token ?? '',
        token_type: token.token_type ?? 'bearer',
        expires_in: token.expires_in ?? 0,
        user,
      };
    } catch (err) {
      throw toLoginError(err);
    }
  },

  async getCurrentUser(token: string): Promise<User> {
    const raw = await apiClient.get<Record<string, unknown>>(
      `${AUTH_BASE}/me`,
      undefined,
      { Authorization: `Bearer ${token}` }
    );
    return mapUser(raw || {});
  },

  async refreshToken(token: string): Promise<{ access_token: string; expires_in: number }> {
    const data = await apiClient.post<{ access_token: string; expires_in: number }>(
      `${AUTH_BASE}/refresh`,
      {},
      { Authorization: `Bearer ${token}` }
    );
    return { access_token: data.access_token, expires_in: data.expires_in };
  },
};
