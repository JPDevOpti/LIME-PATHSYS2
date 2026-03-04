import type { User } from '@/features/auth/types/auth.types';
import type { UserProfile, UserRole } from '../types/userProfile.types';

function backendRoleToProfileRole(role: string): UserRole {
  const r = String(role || '').toLowerCase();
  if (['admin', 'administrator'].includes(r)) return 'admin';
  if (['patologo', 'pathologist', 'patólogo'].includes(r)) return 'patologo';
  if (['residente', 'resident'].includes(r)) return 'residente';
  if (['auxiliar', 'assistant', 'auxiliary', 'recepcionista'].includes(r)) return 'auxiliar';
  if (['facturacion', 'facturación', 'billing', 'visitante'].includes(r)) return 'visitante';
  return 'admin';
}

export function userToProfile(user: User): UserProfile {
  const name = user.name || user.email || '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';

  const role = backendRoleToProfileRole(user.role);

  const roleSpecificData: UserProfile['roleSpecificData'] = {};

  if (user.pathologist_code) {
    roleSpecificData.patologoCode = user.pathologist_code;
    roleSpecificData.pathologistCode = user.pathologist_code;
  }
  if (user.resident_code) roleSpecificData.residentCode = user.resident_code;
  if (user.medical_license) roleSpecificData.registroMedico = user.medical_license;
  if (user.initials) roleSpecificData.iniciales = user.initials;
  if (user.signature) roleSpecificData.firmaUrl = user.signature;
  if (user.observations) roleSpecificData.observaciones = user.observations;
  if (user.administrator_code) {
    roleSpecificData.administratorCode = user.administrator_code;
  }
  if (user.associated_entities?.length) {
    roleSpecificData.associatedEntities = user.associated_entities.map((e) => ({
      id: e.id,
      name: e.name,
      codigo: e.id,
      nombre: e.name,
    }));
  }

  return {
    id: user.id,
    firstName,
    lastName,
    email: user.email,
    document: '',
    documentType: 'CC',
    role,
    isActive: user.is_active,
    createdAt: new Date(),
    updatedAt: new Date(),
    roleSpecificData: Object.keys(roleSpecificData).length ? roleSpecificData : undefined,
  };
}
