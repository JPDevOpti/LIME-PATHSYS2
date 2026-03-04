export interface TestGroup {
    type: 'LOW_COMPLEXITY_IHQ' | 'HIGH_COMPLEXITY_IHQ' | 'SPECIAL_IHQ' | 'HISTOCHEMISTRY';
    tests: Array<{ code: string; quantity: number; name?: string }>;
    observations?: string;
}

export interface UnreadCase {
    id: string;
    caseCode: string;
    isSpecialCase?: boolean;
    documentType?: string;
    patientDocument?: string;
    patientName?: string;
    entityCode?: string;
    entityName?: string;
    institution?: string;
    notes?: string;
    testGroups?: TestGroup[];
    lowComplexityIHQ?: string;
    lowComplexityPlates?: number;
    highComplexityIHQ?: string;
    highComplexityPlates?: number;
    specialIHQ?: string;
    specialPlates?: number;
    histochemistry?: string;
    histochemistryPlates?: number;
    numberOfPlates?: number;
    deliveredTo?: string;
    deliveryDate?: string;
    entryDate?: string;
    receivedBy?: string;
    status?: string;
    receipt?: string;
    createdAt?: string;
    updatedAt?: string;
    updatedBy?: string;
}

export interface UnreadCaseFilters {
    searchQuery: string;
    dateFrom: string;
    dateTo: string;
    selectedInstitution: string;
    selectedTestType: string;
    selectedStatus: string;
}

export interface UnreadCaseListParams {
    page?: number;
    limit?: number;
    searchQuery?: string;
    selectedInstitution?: string;
    selectedTestType?: string;
    selectedStatus?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface BulkMarkDeliveredPayload {
    caseCodes: string[];
    deliveredTo: string;
    deliveryDate?: string;
}

export type UnreadCaseCreatePayload = Omit<UnreadCase, 'id' | 'createdAt' | 'updatedAt'>;
export type UnreadCaseUpdatePayload = Partial<UnreadCaseCreatePayload>;
