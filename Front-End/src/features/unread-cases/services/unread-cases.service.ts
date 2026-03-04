import { apiClient } from '@/shared/api/client';
import type {
    UnreadCase,
    UnreadCaseListParams,
    UnreadCaseCreatePayload,
    UnreadCaseUpdatePayload,
    BulkMarkDeliveredPayload,
    TestGroup
} from '../types/unread-cases.types';

function asString(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return undefined;
}

function parseMongoDate(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
        const dateValue = (value as { $date?: unknown }).$date;
        if (typeof dateValue === 'string') return dateValue;
    }
    return asString(value);
}

function parseMongoId(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        const oid = (value as { $oid?: unknown }).$oid;
        if (typeof oid === 'string') return oid;
    }
    return asString(value);
}

function mapApiToUnreadCase(api: Record<string, unknown>): UnreadCase {
    const rawTestGroups = Array.isArray(api.test_groups) ? api.test_groups : [];
    const testGroups = rawTestGroups
        .filter((group): group is Record<string, unknown> => !!group && typeof group === 'object')
        .map((group): TestGroup => {
            const rawTests = Array.isArray(group.tests) ? group.tests : [];
            const tests = rawTests
                .filter((test): test is Record<string, unknown> => !!test && typeof test === 'object')
                .map((test) => ({
                    code: asString(test.code) ?? '',
                    quantity: Number(test.quantity ?? 0) || 0,
                    name: asString(test.name)
                }))
                .filter((test) => test.code);

            return {
                type: String(group.type ?? '') as TestGroup['type'],
                tests,
                observations: asString(group.observations)
            };
        })
        .filter((group) => group.type && group.tests.length > 0);

    const parsedId = parseMongoId(api.id) ?? parseMongoId(api._id) ?? String(api.case_code ?? '');

    return {
        id: parsedId,
        caseCode: String(api.case_code ?? ''),
        isSpecialCase: api.is_special_case as boolean | undefined,
        documentType: api.document_type as string | undefined,
        patientDocument: api.patient_document as string | undefined,
        patientName: api.patient_name as string | undefined,
        entityCode: api.entity_code as string | undefined,
        entityName: api.entity_name as string | undefined,
        institution: api.institution as string | undefined,
        notes: api.notes as string | undefined,
        testGroups: testGroups.length > 0 ? testGroups : undefined,
        numberOfPlates: api.number_of_plates as number | undefined,
        deliveredTo: api.delivered_to as string | undefined,
        deliveryDate: parseMongoDate(api.delivery_date),
        entryDate: parseMongoDate(api.entry_date),
        receivedBy: api.received_by as string | undefined,
        status: api.status as string | undefined,
        createdAt: parseMongoDate(api.created_at),
        updatedAt: parseMongoDate(api.updated_at),
        updatedBy: api.updated_by as string | undefined
    };
}

function buildCreateBody(data: UnreadCaseCreatePayload): Record<string, unknown> {
    const body: Record<string, unknown> = {
        case_code: data.caseCode ?? undefined,
        is_special_case: data.isSpecialCase ?? false,
        entity_code: data.entityCode,
        entity_name: data.entityName,
        institution: data.institution ?? data.entityName,
        number_of_plates: data.numberOfPlates ?? 1,
        entry_date: data.entryDate ?? new Date().toISOString(),
        received_by: data.receivedBy,
        status: data.status ?? 'En proceso'
    };
    if (data.documentType) body.document_type = data.documentType;
    if (data.patientDocument) body.patient_document = data.patientDocument;
    if (data.patientName) body.patient_name = data.patientName;
    if (data.notes) body.notes = data.notes;
    if (data.testGroups?.length) {
        body.test_groups = data.testGroups.map((g) => ({
            type: g.type,
            tests: g.tests.map((t) => ({ code: t.code, quantity: t.quantity, name: t.name }))
        }));
    }
    return body;
}

function buildUpdateBody(data: UnreadCaseUpdatePayload): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (data.isSpecialCase !== undefined) body.is_special_case = data.isSpecialCase;
    if (data.documentType !== undefined) body.document_type = data.documentType;
    if (data.patientName !== undefined) body.patient_name = data.patientName;
    if (data.patientDocument !== undefined) body.patient_document = data.patientDocument;
    if (data.entityCode !== undefined) body.entity_code = data.entityCode;
    if (data.entityName !== undefined) body.entity_name = data.entityName;
    if (data.institution !== undefined) body.institution = data.institution;
    if (data.notes !== undefined) body.notes = data.notes;
    if (data.numberOfPlates !== undefined) body.number_of_plates = data.numberOfPlates;
    if (data.status !== undefined) body.status = data.status;
    if (data.testGroups !== undefined) {
        body.test_groups = data.testGroups.map((g) => ({
            type: g.type,
            tests: g.tests.map((t) => ({ code: t.code, quantity: t.quantity, name: t.name }))
        }));
    }
    return body;
}

export const unreadCasesService = {
    async list(params: UnreadCaseListParams = {}): Promise<{ items: UnreadCase[]; total: number }> {
        const query: Record<string, string | number> = {
            page: params.page ?? 1,
            limit: params.limit ?? 25
        };
        if (params.searchQuery?.trim()) query.search = params.searchQuery.trim();
        if (params.selectedInstitution) query.institution = params.selectedInstitution;
        if (params.selectedTestType) query.test_type = params.selectedTestType;
        if (params.selectedStatus) query.status = params.selectedStatus;
        if (params.dateFrom) query.date_from = params.dateFrom;
        if (params.dateTo) query.date_to = params.dateTo;

        const res = await apiClient.get<{ data: unknown[]; total: number }>(
            '/api/v1/unread-cases',
            query
        );
        const items = (res.data || []).map((d) => mapApiToUnreadCase(d as Record<string, unknown>));
        return { items, total: res.total };
    },

    async get(caseCode: string): Promise<UnreadCase | null> {
        try {
            const api = await apiClient.get<Record<string, unknown>>(
                `/api/v1/unread-cases/${encodeURIComponent(caseCode)}`
            );
            return mapApiToUnreadCase(api);
        } catch {
            return null;
        }
    },

    async create(payload: UnreadCaseCreatePayload): Promise<UnreadCase> {
        const body = buildCreateBody(payload);
        const api = await apiClient.post<Record<string, unknown>>('/api/v1/unread-cases', body);
        return mapApiToUnreadCase(api);
    },

    async update(caseCode: string, payload: UnreadCaseUpdatePayload): Promise<UnreadCase> {
        const body = buildUpdateBody(payload);
        const api = await apiClient.put<Record<string, unknown>>(
            `/api/v1/unread-cases/${encodeURIComponent(caseCode)}`,
            body
        );
        return mapApiToUnreadCase(api);
    },

    async delete(caseCode: string): Promise<void> {
        await apiClient.delete(`/api/v1/unread-cases/${encodeURIComponent(caseCode)}`);
    },

    async markDelivered(payload: BulkMarkDeliveredPayload): Promise<UnreadCase[]> {
        const body = {
            case_codes: payload.caseCodes,
            delivered_to: payload.deliveredTo,
            delivery_date: payload.deliveryDate
        };
        const res = await apiClient.post<unknown[]>('/api/v1/unread-cases/mark-delivered', body);
        return (res || []).map((d) => mapApiToUnreadCase(d as Record<string, unknown>));
    }
};
