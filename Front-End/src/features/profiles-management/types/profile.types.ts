export type ProfileRole =
    | 'administrador'
    | 'patologo'
    | 'residente'
    | 'recepcion'
    | 'visitante';

export interface Profile {
    id: string;
    name: string;
    code?: string;
    email?: string;
    document?: string;
    initials?: string;
    medicalLicense?: string;
    observations?: string;
    signature?: string;
    role: ProfileRole;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProfileFilters {
    searchQuery: string;
    role: string;
    status: string;
    dateFrom: string;
    dateTo: string;
}

export interface CreateProfilePayload {
    name: string;
    password: string;
    code?: string;
    email?: string;
    document?: string;
    initials?: string;
    medicalLicense?: string;
    observations?: string;
    signature?: string;
    role: ProfileRole;
    isActive?: boolean;
}

export type UpdateProfilePayload = Partial<CreateProfilePayload> & { isActive?: boolean };
