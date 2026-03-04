import type { LabTest } from '../types/lab-tests.types';

export const MOCK_ADDITIONAL_TESTS: LabTest[] = [
    {
        id: '1',
        test_code: 'BIO-01',
        name: 'Biopsia',
        description: 'Estudio histopatologico de tejido mediante biopsia',
        time: 7,
        price: 85000,
        is_active: true,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-06-20T14:30:00Z'
    },
    {
        id: '2',
        test_code: 'IHC-01',
        name: 'Inmunohistoquimica',
        description: 'Marcadores inmunohistoquimicos para caracterizacion tumoral',
        time: 10,
        price: 120000,
        is_active: true,
        created_at: '2024-02-01T09:00:00Z',
        updated_at: '2024-05-10T11:00:00Z'
    },
    {
        id: '3',
        test_code: 'CIT-01',
        name: 'Citologia',
        description: 'Estudio citologico de muestras',
        time: 5,
        price: 45000,
        is_active: true,
        created_at: '2024-03-10T08:00:00Z'
    },
    {
        id: '4',
        test_code: 'FROZ-01',
        name: 'Corte congelado',
        description: 'Estudio intraoperatorio por corte congelado',
        time: 1,
        price: 95000,
        is_active: true,
        created_at: '2024-04-05T12:00:00Z'
    },
    {
        id: '5',
        test_code: 'MOL-01',
        name: 'Estudio molecular',
        description: 'Analisis molecular para mutaciones especificas',
        time: 14,
        price: 250000,
        is_active: false,
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-08-01T09:00:00Z'
    }
];
