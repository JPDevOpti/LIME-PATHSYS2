import { apiClient, getStoredUser } from '@/shared/api/client';
import { Patient } from '@/features/patients/types/patient.types';
import {
    CreateCaseRequest,
    UpdateCaseRequest,
    Case,
    CaseEntity,
    CaseFilters,
    CaseNote,
    TestInfo,
    SampleInfo,
    AssignedPathologist
} from '../types/case.types';

const API_BASE = '/api/v1/cases';

function getUserHeaders(): Record<string, string> {
    const stored = getStoredUser() as Record<string, unknown> | null;
    const headers: Record<string, string> = {};
    if (stored?.email) headers['X-User-Email'] = String(stored.email);
    if (stored?.name) headers['X-User-Name'] = String(stored.name);
    return headers;
}

function apiToCase(raw: Record<string, unknown>): Case {
    const patientInfo = raw.patient_info as Record<string, unknown> | undefined;
    const samples = (raw.samples as SampleInfo[] | undefined)?.map(s => ({
        body_region: s.body_region,
        tests: (s.tests || []).map((t: { id?: string; test_code?: string; code?: string; name: string; quantity: number; time?: number }) => ({
            id: t.id ?? '',
            test_code: t.test_code ?? t.code ?? '',
            name: t.name,
            quantity: t.quantity ?? 1,
            time: t.time,
        }))
    })) ?? [];
    const patient: Patient = patientInfo ? {
        id: String(patientInfo.patient_id ?? ''),
        patient_code: String(patientInfo.patient_code ?? ''),
        identification_type: (patientInfo.identification_type as Patient['identification_type']) ?? 'CC',
        identification_number: String(patientInfo.identification_number ?? ''),
        first_name: String(patientInfo.first_name ?? ''),
        second_name: patientInfo.second_name as string | undefined,
        first_lastname: String(patientInfo.first_lastname ?? ''),
        second_lastname: patientInfo.second_lastname as string | undefined,
        full_name: String(patientInfo.full_name ?? ''),
        birth_date: patientInfo.birth_date as string | undefined,
        age: ((patientInfo.age_at_diagnosis ?? patientInfo.age) as number | undefined),
        gender: (patientInfo.gender as Patient['gender']) ?? 'Masculino',
        phone: patientInfo.phone as string | undefined,
        email: patientInfo.email as string | undefined,
        care_type: (patientInfo.care_type as Patient['care_type']) ?? 'Ambulatorio',
        entity_info: patientInfo.entity_info as Patient['entity_info'],
        location: patientInfo.location as Patient['location'],
        observations: patientInfo.observations as string | undefined
    } : {} as Patient;
    return {
        id: String(raw.id ?? ''),
        case_code: String(raw.case_code ?? ''),
        patient,
        priority: (raw.priority as Case['priority']) ?? 'normal',
        doctor: String(raw.requesting_physician ?? ''),
        service: String(raw.service ?? ''),
        previous_study: Boolean(raw.previous_study),
        entity: ((): CaseEntity => {
            const e = raw.entity;
            if (e && typeof e === 'object') {
                const obj = e as Record<string, unknown>;
                return { id: String(obj.id ?? ''), name: String(obj.name ?? '') };
            }
            return { id: '', name: String(e ?? '') };
        })(),
        observations: String(raw.observations ?? ''),
        samples,
        created_by: raw.created_by as string | undefined,
        status: raw.state as Case['status'],
        opportunity_info: raw.opportunity_info as Case['opportunity_info'],
        assigned_pathologist: raw.assigned_pathologist as Case['assigned_pathologist'],
        assistant_pathologists: raw.assistant_pathologists as Case['assistant_pathologists'],
        assigned_resident: raw.assigned_resident as Case['assigned_resident'],
        result: raw.result as Case['result'],
        audit_info: raw.audit_info as Case['audit_info'],
        date_info: raw.date_info as Case['date_info'],
        complementary_tests: raw.complementary_tests as Case['complementary_tests'],
        complementary_tests_reason: raw.complementary_tests_reason as string | undefined,
        delivered_to: raw.delivered_to as string | undefined,
        additional_notes: raw.additional_notes as CaseNote[] | undefined,
    };
}

function toCreateBody(data: CreateCaseRequest): Record<string, unknown> {
    const priority = data.priority === 'normal' ? 'Normal' : 'Prioritario';
    const body: Record<string, unknown> = {
        patient_id: data.patientId,
        priority,
        requesting_physician: data.doctor,
        service: data.service || undefined,
        entity: data.entity?.name ? data.entity : undefined,
        observations: data.observations || undefined,
        previous_study: data.previous_study,
        samples: (data.samples || []).map(s => ({
            body_region: s.body_region,
            tests: (s.tests || []).map((t: TestInfo) => ({
                id: t.id || undefined,
                test_code: t.test_code,
                name: t.name,
                quantity: t.quantity ?? 1
            }))
        }))
    };
    if (data.max_opportunity_time !== undefined) {
        body.max_opportunity_time = data.max_opportunity_time;
    }
    if (data.assigned_pathologist) {
        body.assigned_pathologist = data.assigned_pathologist;
    }
    if (data.assistant_pathologists) {
        body.assistant_pathologists = data.assistant_pathologists;
    }
    if (data.care_type) {
        body.care_type = data.care_type;
    }
    return body;
}

function toUpdateBody(data: UpdateCaseRequest): Record<string, unknown> {
    const priority = data.priority === 'normal' ? 'Normal' : 'Prioritario';
    const clearable = (v: string | null | undefined) => v === null ? null : (v || undefined);
    const body: Record<string, unknown> = {
        priority,
        requesting_physician: data.doctor,
        service: clearable(data.service),
        entity: data.entity?.name ? data.entity : (data.entity === undefined ? undefined : null),
        observations: clearable(data.observations),
        previous_study: data.previous_study,
        samples: (data.samples || []).map(s => ({
            body_region: s.body_region,
            tests: (s.tests || []).map((t: TestInfo) => ({
                id: t.id || undefined,
                test_code: t.test_code,
                name: t.name,
                quantity: t.quantity ?? 1
            }))
        }))
    };
    if (data.max_opportunity_time !== undefined) {
        body.max_opportunity_time = data.max_opportunity_time;
    }
    if (data.assigned_pathologist) {
        body.assigned_pathologist = data.assigned_pathologist;
    }
    if (data.assistant_pathologists) {
        body.assistant_pathologists = data.assistant_pathologists;
    }
    if (data.care_type) {
        body.care_type = data.care_type;
    }
    if (data.status) {
        body.state = data.status;
    }
    return body;
}

function buildCaseParams(filters?: CaseFilters): Record<string, string | number | undefined> {
    return {
        search: filters?.search,
        created_at_from: filters?.created_at_from,
        created_at_to: filters?.created_at_to,
        entity: filters?.entity,
        assigned_pathologist: filters?.assigned_pathologist,
        pathologist_name: filters?.pathologist_name,
        priority: filters?.priority,
        test: filters?.test,
        state: filters?.status,
        doctor: filters?.doctor,
        patient_id: filters?.patient_id,
        identification_number: filters?.identification_number,
        sort_by: filters?.sort_by,
        sort_order: filters?.sort_order,
    };
}

type TranscriptionData = {
    method?: string[];
    macro_result?: string;
    micro_result?: string;
    diagnosis?: string;
    cie10_diagnosis?: { code: string; name: string } | null;
    cieo_diagnosis?: { code: string; name: string } | null;
    diagnosis_images?: string[];
    complementary_tests?: { code: string; name: string; quantity: number }[];
    complementary_tests_reason?: string;
};

function toTranscriptionBody(data: TranscriptionData): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (data.method !== undefined) body.method = data.method;
    if (data.macro_result !== undefined) body.macro_result = data.macro_result;
    if (data.micro_result !== undefined) body.micro_result = data.micro_result;
    if (data.diagnosis !== undefined) body.diagnosis = data.diagnosis;
    if (data.cie10_diagnosis !== undefined) body.cie10_diagnosis = data.cie10_diagnosis;
    if (data.cieo_diagnosis !== undefined) body.cieo_diagnosis = data.cieo_diagnosis;
    if (data.diagnosis_images !== undefined) body.diagnosis_images = data.diagnosis_images;
    if (data.complementary_tests !== undefined) body.complementary_tests = data.complementary_tests;
    if (data.complementary_tests_reason !== undefined) body.complementary_tests_reason = data.complementary_tests_reason;
    return body;
}

export const caseService = {
    async getCases(filters?: CaseFilters): Promise<{ data: Case[]; total: number }> {
        const params = {
            ...buildCaseParams(filters),
            skip: filters?.skip ?? 0,
            limit: filters?.limit ?? 50,
        };
        const res = await apiClient.get<{ data: Record<string, unknown>[]; total: number }>(API_BASE, params);
        return { data: (res.data || []).map(apiToCase), total: res.total ?? 0 };
    },

    async createCase(data: CreateCaseRequest, _patient: Patient): Promise<Case> {
        const body = toCreateBody(data);
        const raw = await apiClient.post<Record<string, unknown>>(`${API_BASE}`, body, getUserHeaders());
        return apiToCase(raw);
    },

    async getCasesByPatientId(patientId: string): Promise<Case[]> {
        const { data } = await this.getCases({ patient_id: patientId });
        return data;
    },

    async getCaseByCode(code: string): Promise<Case | null> {
        try {
            const raw = await apiClient.get<Record<string, unknown>>(`${API_BASE}/code/${encodeURIComponent(code.trim())}`);
            return apiToCase(raw);
        } catch {
            return null;
        }
    },

    async getCaseById(id: string): Promise<Case | null> {
        try {
            const raw = await apiClient.get<Record<string, unknown>>(`${API_BASE}/${id}`);
            return apiToCase(raw);
        } catch {
            return null;
        }
    },

    async updateCase(id: string, data: UpdateCaseRequest): Promise<Case> {
        const body = toUpdateBody(data);
        const raw = await apiClient.put<Record<string, unknown>>(`${API_BASE}/${id}`, body, getUserHeaders());
        return apiToCase(raw);
    },

    async updateCaseTranscription(
        caseId: string,
        data: TranscriptionData,
        skipStateUpdate: boolean = false
    ): Promise<Case> {
        const query = skipStateUpdate ? '?skip_state_update=true' : '';
        const raw = await apiClient.put<Record<string, unknown>>(
            `${API_BASE}/${caseId}/transcription${query}`,
            toTranscriptionBody(data),
            getUserHeaders()
        );
        return apiToCase(raw);
    },

    async signCase(caseId: string, data: TranscriptionData): Promise<Case> {
        const raw = await apiClient.put<Record<string, unknown>>(
            `${API_BASE}/${caseId}/sign`,
            toTranscriptionBody(data),
            getUserHeaders()
        );
        return apiToCase(raw);
    },

    async updateCasePathologist(caseId: string, assignedPathologist: AssignedPathologist): Promise<Case> {
        const body = { assigned_pathologist: assignedPathologist };
        const raw = await apiClient.put<Record<string, unknown>>(`${API_BASE}/${caseId}`, body, getUserHeaders());
        return apiToCase(raw);
    },

    async updateCaseAssistants(caseId: string, assistants: AssignedPathologist[]): Promise<Case> {
        const body = { assistant_pathologists: assistants };
        const raw = await apiClient.put<Record<string, unknown>>(`${API_BASE}/${caseId}`, body, getUserHeaders());
        return apiToCase(raw);
    },

    async updateCaseResident(caseId: string, resident: AssignedPathologist | null): Promise<Case> {
        const body = { assigned_resident: resident };
        const raw = await apiClient.put<Record<string, unknown>>(`${API_BASE}/${caseId}`, body, getUserHeaders());
        return apiToCase(raw);
    },

    async markCasesDelivered(
        caseEdits: { caseId: string; tests?: unknown[] }[],
        deliveredTo: string
    ): Promise<Case[]> {
        const headers = getUserHeaders();
        const BATCH_SIZE = 10;
        const results: Case[] = [];
        for (let i = 0; i < caseEdits.length; i += BATCH_SIZE) {
            const batch = caseEdits.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(edit =>
                    apiClient.put<Record<string, unknown>>(
                        `${API_BASE}/${edit.caseId}`,
                        { state: 'Completado', delivered_to: deliveredTo },
                        headers
                    ).then(apiToCase)
                )
            );
            results.push(...batchResults);
        }
        return results;
    },

    async deleteCase(id: string): Promise<void> {
        await apiClient.delete(`${API_BASE}/${id}`);
    },

    async addNote(caseId: string, text: string): Promise<Case> {
        const raw = await apiClient.post<Record<string, unknown>>(
            `${API_BASE}/${caseId}/notes`,
            { text },
            getUserHeaders()
        );
        return apiToCase(raw);
    },

    async deleteNote(caseId: string, noteIndex: number): Promise<Case> {
        await apiClient.delete(`${API_BASE}/${caseId}/notes/${noteIndex}`);
        const raw = await apiClient.get<Record<string, unknown>>(`${API_BASE}/${caseId}`);
        return apiToCase(raw);
    },

    async getAllCasesForExport(filters?: CaseFilters): Promise<Case[]> {
        const params = { ...buildCaseParams(filters), skip: 0, limit: 100000 };
        const res = await apiClient.get<{ data: Record<string, unknown>[]; total: number }>(API_BASE, params);
        return (res.data || []).map(apiToCase);
    }
};
