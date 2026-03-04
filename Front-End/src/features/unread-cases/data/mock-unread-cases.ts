import type { UnreadCase } from '../types/unread-cases.types';

export const MOCK_UNREAD_CASES: UnreadCase[] = [
    {
        id: '1',
        caseCode: 'TC2025-00001',
        isSpecialCase: false,
        patientDocument: '123456789',
        patientName: 'Juan Perez Garcia',
        institution: 'Hospital General',
        status: 'En recepción',
        numberOfPlates: 5,
        entryDate: '2025-02-10T09:00:00Z',
        testGroups: [
            {
                type: 'LOW_COMPLEXITY_IHQ',
                tests: [{ code: 'IHC-01', quantity: 2, name: 'Inmunohistoquimica' }, { code: 'BIO-01', quantity: 1, name: 'Biopsia' }]
            }
        ],
        createdAt: '2025-02-10T09:00:00Z',
        updatedAt: '2025-02-10T09:00:00Z'
    },
    {
        id: '2',
        caseCode: 'TC2025-00015',
        isSpecialCase: true,
        patientName: 'Caso Especial',
        institution: 'Clinica Las Americas',
        status: 'En recepción',
        numberOfPlates: 3,
        entryDate: '2025-02-11T11:00:00Z',
        testGroups: [
            { type: 'HISTOCHEMISTRY', tests: [{ code: 'HIST-01', quantity: 3, name: 'Histoquimica' }] }
        ],
        createdAt: '2025-02-11T11:00:00Z',
        updatedAt: '2025-02-11T11:00:00Z'
    },
    {
        id: '3',
        caseCode: 'TC2025-00022',
        isSpecialCase: false,
        patientDocument: '987654321',
        patientName: 'Maria Gomez Lopez',
        institution: 'Entidad 1',
        status: 'Completado',
        numberOfPlates: 4,
        entryDate: '2025-02-09T08:00:00Z',
        deliveryDate: '2025-02-10T16:00:00Z',
        deliveredTo: 'Laboratorio Central',
        testGroups: [
            { type: 'HIGH_COMPLEXITY_IHQ', tests: [{ code: 'IHQ-ALTA', quantity: 2 }] }
        ],
        createdAt: '2025-02-09T08:00:00Z',
        updatedAt: '2025-02-10T16:00:00Z'
    }
];
