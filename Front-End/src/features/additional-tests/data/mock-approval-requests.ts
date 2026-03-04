import type { ApprovalRequestResponse } from '../types/cases-approval.types';

export const MOCK_APPROVAL_REQUESTS: ApprovalRequestResponse[] = [
    {
        id: '1',
        approval_code: 'APR-2025-001',
        original_case_code: '2025-00001',
        approval_state: 'pending_approval',
        entity: 'Hospital General',
        additional_tests: [
            { code: 'IHC-01', name: 'Inmunohistoquimica', quantity: 1 },
            { code: 'BIO-01', name: 'Biopsia', quantity: 2 }
        ],
        approval_info: {
            reason: 'Se requiere inmunohistoquimica para caracterizacion tumoral',
            request_date: '2025-02-10T09:00:00Z',
            assigned_pathologist: { id: 'p1', name: 'Dr. Juan Perez' }
        },
        created_at: '2025-02-10T09:00:00Z',
        updated_at: '2025-02-11T14:30:00Z'
    },
    {
        id: '2',
        approval_code: 'APR-2025-002',
        original_case_code: '2025-00015',
        approval_state: 'request_made',
        entity: 'Clinica Las Americas',
        additional_tests: [
            { code: 'CIT-01', name: 'Citologia', quantity: 1 }
        ],
        approval_info: {
            reason: 'Complementar estudio citologico',
            request_date: '2025-02-11T11:00:00Z',
            assigned_pathologist: { id: 'p2', name: 'Dra. Maria Gomez' }
        },
        created_at: '2025-02-11T11:00:00Z',
        updated_at: '2025-02-11T11:00:00Z'
    },
    {
        id: '3',
        approval_code: 'APR-2025-003',
        original_case_code: '2025-00022',
        approval_state: 'approved',
        entity: 'Hospital General',
        additional_tests: [
            { code: 'FROZ-01', name: 'Corte congelado', quantity: 1 }
        ],
        approval_info: {
            reason: 'Estudio intraoperatorio',
            request_date: '2025-02-09T08:00:00Z',
            assigned_pathologist: { id: 'p1', name: 'Dr. Juan Perez' }
        },
        created_at: '2025-02-09T08:00:00Z',
        updated_at: '2025-02-10T10:00:00Z'
    },
    {
        id: '4',
        approval_code: 'APR-2025-004',
        original_case_code: '2025-00008',
        approval_state: 'rejected',
        entity: 'Entidad 1',
        additional_tests: [
            { code: 'MOL-01', name: 'Estudio molecular', quantity: 1 }
        ],
        approval_info: {
            reason: 'Solicitud de estudio molecular',
            request_date: '2025-02-08T15:00:00Z',
            assigned_pathologist: { id: 'p2', name: 'Dra. Maria Gomez' }
        },
        created_at: '2025-02-08T15:00:00Z',
        updated_at: '2025-02-09T09:00:00Z'
    }
];
