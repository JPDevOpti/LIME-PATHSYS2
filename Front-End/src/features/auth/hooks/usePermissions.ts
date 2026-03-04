import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types/auth.types';

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role ?? null;

  const isAdmin = useMemo(
    () =>
      ['administrator', 'admin', 'administrador'].includes(
        (role ?? '').toString().trim().toLowerCase()
      ),
    [role]
  );
  const isPatologo = useMemo(
    () =>
      ['pathologist', 'patologo', 'patólogo'].includes(
        (role ?? '').toString().trim().toLowerCase()
      ),
    [role]
  );
  const isResidente = useMemo(
    () =>
      ['resident', 'residente'].includes((role ?? '').toString().trim().toLowerCase()),
    [role]
  );
  const isAuxiliar = useMemo(
    () =>
      ['recepcionista', 'receptionist', 'auxiliar'].includes(
        (role ?? '').toString().trim().toLowerCase()
      ),
    [role]
  );
  const isVisitante = useMemo(
    () =>
      ['visitante', 'billing', 'facturacion'].includes(
        (role ?? '').toString().trim().toLowerCase()
      ),
    [role]
  );
  const isPaciente = useMemo(() => role === 'paciente', [role]);

  const canCreatePatients = isAdmin || isResidente || isAuxiliar;
  const canEditPatients = isAdmin || isResidente || isAuxiliar;
  const canAccessPatients = isAdmin || isPatologo || isResidente || isAuxiliar;
  const canCreateCases = isAdmin || isResidente || isAuxiliar;
  const canEditCases = isAdmin || isResidente || isAuxiliar;
  const canAccessCaseList = isAdmin || isPatologo || isAuxiliar || isResidente || isVisitante || isPaciente;
  const canAccessCases = isAdmin || isPatologo || isAuxiliar || isResidente || isVisitante || isPaciente;
  const canTranscribe = isAdmin || isResidente || isAuxiliar;
  const canSignResults = isAdmin || isPatologo;
  const canAccessResults = isAdmin || isPatologo || isAuxiliar || isResidente;
  const canAccessLab = isAdmin || isResidente || isAuxiliar;
  const canAccessAnalytics = isAdmin || isVisitante || isAuxiliar;
  const canAccessBilling = isAdmin || isAuxiliar;
  const canAccessSettings = isAdmin;

  const hasRole = (r: Role): boolean => role === r;
  const hasAnyRole = (roles: Role[]): boolean =>
    role !== null && roles.includes(role as Role);

  return {
    isAdmin,
    isPatologo,
    isResidente,
    isAuxiliar,
    isVisitante,
    isPaciente,
    canCreatePatients,
    canEditPatients,
    canAccessPatients,
    canCreateCases,
    canEditCases,
    canAccessCaseList,
    canAccessCases,
    canTranscribe,
    canSignResults,
    canAccessResults,
    canAccessLab,
    canAccessAnalytics,
    canAccessBilling,
    canAccessSettings,
    hasRole,
    hasAnyRole,
  };
}
