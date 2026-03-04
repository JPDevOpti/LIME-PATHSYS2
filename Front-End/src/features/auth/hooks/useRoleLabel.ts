import type { Role } from '../types/auth.types';

const ROLE_LABELS: Record<string, string> = {
  administrator: 'Administrador',
  admin: 'Administrador',
  pathologist: 'Patólogo',
  resident: 'Residente',
  recepcionista: 'Auxiliar',
  receptionist: 'Auxiliar',
  visitante: 'Visitante',
  billing: 'Visitante',
  facturacion: 'Visitante',
  facturación: 'Visitante',
};

export function useRoleLabel() {
  const translateRole = (role: string | null | undefined): string => {
    const r = (role ?? '').toString().trim().toLowerCase();
    return ROLE_LABELS[r] ?? (r ? r.charAt(0).toUpperCase() + r.slice(1) : 'Usuario');
  };
  return { translateRole, roleLabels: ROLE_LABELS };
}
