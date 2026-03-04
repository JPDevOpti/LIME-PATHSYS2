import type { Entity } from '../types/entity.types';

export const MOCK_ENTITIES: Entity[] = [
    {
        id: '1',
        name: 'Hospital Alma Mater',
        code: 'HAMA-001',
        observations: 'Entidad principal de referencia',
        is_active: true,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-06-20T14:30:00Z',
    },
    {
        id: '2',
        name: 'Universidad de Antioquia',
        code: 'UDEA-001',
        observations: '',
        is_active: true,
        created_at: '2024-02-01T09:00:00Z',
    },
    {
        id: '3',
        name: 'Clinica Las Americas',
        code: 'CLA-002',
        observations: 'Convenio especial',
        is_active: true,
        created_at: '2024-03-10T08:00:00Z',
        updated_at: '2024-05-10T11:00:00Z',
    },
    {
        id: '4',
        name: 'Hospital San Vicente',
        code: 'HSV-003',
        observations: '',
        is_active: true,
        created_at: '2024-04-05T12:00:00Z',
    },
    {
        id: '5',
        name: 'IPS Universitaria',
        code: 'IPSU-004',
        observations: 'Entidad inactiva temporalmente',
        is_active: false,
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-08-01T09:00:00Z',
    },
];
