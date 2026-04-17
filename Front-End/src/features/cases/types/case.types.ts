import { Patient, CareType } from '@/features/patients/types/patient.types';

export type CasePriority = 'normal' | 'prioritario';

export type CaseStatus =
    | 'En recepción'
    | 'Corte macro'
    | 'Descrip micro'
    | 'Por firmar'
    | 'Por entregar'
    | 'Completado';

export interface TestInfo {
    id: string;
    test_code: string;
    name: string;
    quantity: number;
    time?: number;
}

export interface SampleInfo {
    body_region: string;
    tests: TestInfo[];
}

export interface CaseEntity {
    id: string;
    name: string;
}

export interface CreateCaseRequest {
    patientId: string;
    priority: CasePriority;
    doctor: string;
    service: string;
    previous_study: boolean;
    observations: string;
    entity?: CaseEntity;
    care_type?: CareType;
    numberOfSamples: number;
    samples: SampleInfo[];
    assigned_pathologist?: AssignedPathologist;
    assistant_pathologists?: AssignedPathologist[];
    max_opportunity_time?: number;
}

export interface UpdateCaseRequest extends Omit<CreateCaseRequest, 'patientId'> {
    status?: CaseStatus;
    delivered_to?: string;
}

export type CaseSortKey =
    | 'case_code'
    | 'patient'
    | 'entity'
    | 'pathologist'
    | 'tests'
    | 'status'
    | 'created_at'
    | 'priority'
    | 'doctor'
    | 'service';

export interface CaseFilters {
    search?: string;
    created_at_from?: string;
    created_at_to?: string;
    /** Nombres de entidad (OR). Requiere no usar `entity` suelto. */
    entity_names?: string[];
    assigned_pathologist_names?: string[];
    entity?: string;
    assigned_pathologist?: string;
    pathologist_name?: string;
    priority?: CasePriority | '';
    test?: string;
    /** Códigos de prueba (OR sobre `samples.tests.test_code`). */
    test_codes?: string[];
    status?: CaseStatus | '';
    /** Varios estados (OR). Si viene, tiene prioridad sobre `status` suelto. */
    states?: CaseStatus[];
    doctor?: string;
    patient_id?: string;
    identification_number?: string;
    opportunity?: 'fuera' | 'dentro' | '';
    sort_by?: CaseSortKey;
    sort_order?: 'asc' | 'desc';
    skip?: number;
    limit?: number;
}

export interface AssignedPathologist {
    id: string;
    name: string;
    role?: 'assistant' | 'resident';
}

export interface AuditEntry {
    action: 'created' | 'edited' | 'delivered' | 'signed' | 'transcribed';
    user_name: string;
    user_email: string;
    timestamp: string;
    /** Líneas en español con cambios concretos (solo en ediciones). */
    details?: string[];
}

export type DateEntryAction = 'created_at' | 'update_at' | 'transcribed_at' | 'signed_at' | 'delivered_at';

export interface DateEntry {
    created_at?: string;
    update_at?: string;
    transcribed_at?: string;
    signed_at?: string;
    delivered_at?: string;
}

export interface OpportunityInfo {
    opportunity_time?: number;
    max_opportunity_time?: number;
    was_timely?: boolean;
}

export interface ComplementaryTestRequest {
    code: string;
    name: string;
    quantity: number;
}

export interface CaseResult {
    method?: string[];
    macro_result?: string;
    micro_result?: string;
    diagnosis?: string;
    cie10_diagnosis?: { code: string; name: string } | null;
    cieo_diagnosis?: { code: string; name: string } | null;
    diagnosis_images?: string[];
}

export interface CaseNote {
    text: string;
    date: string;
}

export interface Case {
    id: string;
    case_code: string;
    patient: Patient;
    priority: CasePriority;
    doctor: string;
    service: string;
    previous_study: boolean;
    entity: CaseEntity;
    observations: string;
    samples: SampleInfo[];
    created_by?: string;
    status?: CaseStatus;
    opportunity_info?: OpportunityInfo[];
    assigned_pathologist?: AssignedPathologist;
    assistant_pathologists?: AssignedPathologist[];
    assigned_resident?: AssignedPathologist;
    result?: CaseResult;
    audit_info?: AuditEntry[];
    date_info?: DateEntry[];
    complementary_tests?: ComplementaryTestRequest[];
    complementary_tests_reason?: string;
    delivered_to?: string;
    additional_notes?: CaseNote[];
}

export function getDateFromDateInfo(dateInfo: DateEntry[] | undefined, action: DateEntryAction): string | undefined {
    if (!dateInfo || dateInfo.length === 0) return undefined;
    return dateInfo[0][action] as string | undefined;
}
