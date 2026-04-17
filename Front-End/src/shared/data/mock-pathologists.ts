export interface Pathologist {
    id: string;
    name: string;
    email: string;
    medical_registry: string;
    is_active: boolean;
}

const MOCK_PATHOLOGISTS: Pathologist[] = [
    { id: 'p1', name: 'Dr. Juan Perez', email: 'juan.perez@clinic.com', medical_registry: 'RM-12345', is_active: true },
    { id: 'p2', name: 'Dra. Maria Gomez', email: 'maria.gomez@clinic.com', medical_registry: 'RM-67890', is_active: true },
    { id: 'p3', name: 'Dr. Carlos Rodriguez', email: 'carlos.rodriguez@clinic.com', medical_registry: 'RM-11223', is_active: true },
    { id: 'p4', name: 'Dra. Ana Martinez', email: 'ana.martinez@clinic.com', medical_registry: 'RM-44556', is_active: false }
];

function getInitials(name: string): string {
    return name.split(/\s+/).map((w) => w.charAt(0)).join('').toUpperCase();
}

export function getPathologists(): Pathologist[] {
    return [...MOCK_PATHOLOGISTS];
}

export const PATHOLOGIST_OPTIONS = MOCK_PATHOLOGISTS.map((p) => ({
    value: p.id,
    label: p.name,
    subtitle: getInitials(p.name)
}));
