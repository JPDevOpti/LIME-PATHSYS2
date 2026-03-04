import type { UserProfile } from '../types/userProfile.types';

// Mock - reemplazar con auth/API cuando el backend esté disponible
export const mockUserProfile: UserProfile = {
    id: '1',
    firstName: 'Maria',
    lastName: 'Lopez',
    email: 'maria.lopez@lime.com',
    document: '',
    documentType: 'CC',
    role: 'patologo',
    isActive: true,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    roleSpecificData: {
        iniciales: 'ML',
        registroMedico: '12345',
        firmaUrl: '',
        observaciones: '',
        patologoCode: 'P001',
        pathologistCode: 'P001',
    },
};
