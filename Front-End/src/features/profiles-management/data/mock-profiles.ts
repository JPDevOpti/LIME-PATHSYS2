import type { Profile } from '../types/profile.types';

export const MOCK_PROFILES: Profile[] = [
    { id: '1', name: 'Admin Principal', code: 'ADM001', email: 'admin@lime.com', document: '12345678', role: 'administrador', isActive: true, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z' },
    { id: '2', name: 'Maria Garcia', code: 'PAT001', email: 'maria.garcia@lime.com', initials: 'MEG', medicalLicense: 'RM-52987', role: 'patologo', isActive: true, createdAt: '2024-02-01T09:00:00Z', updatedAt: '2024-02-01T09:00:00Z' },
    { id: '3', name: 'Carlos Rodriguez', code: 'RES001', email: 'carlos.rodriguez@lime.com', initials: 'CR', medicalLicense: 'RM-79854', role: 'residente', isActive: false, createdAt: '2024-02-10T14:30:00Z', updatedAt: '2024-02-10T14:30:00Z' },
    { id: '4', name: 'Laura Perez', code: 'REC001', email: 'laura.perez@lime.com', role: 'recepcionista', isActive: true, createdAt: '2024-03-01T08:00:00Z', updatedAt: '2024-03-01T08:00:00Z' },
    { id: '5', name: 'Ana Martinez', code: 'FAC001', email: 'ana.martinez@lime.com', document: '55667788', role: 'visitante', isActive: false, createdAt: '2024-03-15T11:00:00Z', updatedAt: '2024-03-15T11:00:00Z' },
    ];
