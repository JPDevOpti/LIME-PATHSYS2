export type ApprovalState =
    | 'request_made'
    | 'pending_approval'
    | 'approved'
    | 'rejected';

export interface AdditionalTestInfo {
    code: string;
    name: string;
    quantity: number;
}

export interface AssignedPathologist {
    id?: string;
    name?: string;
}

export interface ApprovalRequestResponse {
    id: string;
    approval_code: string;
    original_case_code: string;
    approval_state: ApprovalState;
    entity?: string;
    additional_tests: AdditionalTestInfo[];
    approval_info: {
        reason?: string;
        request_date?: string;
        assigned_pathologist?: AssignedPathologist;
    };
    created_at: string;
    updated_at: string;
}

export interface ApprovalRequestSearch {
    original_case_code?: string;
    approval_state?: ApprovalState;
    entity?: string;
    pathologist_id?: string;
    test_code?: string;
    request_date_from?: string;
    request_date_to?: string;
}

export interface CaseToApproveViewModel {
    id: string;
    approvalCode: string;
    caseCode: string;
    patientName: string;
    pathologistName: string;
    pathologistId: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    status: ApprovalState;
    additionalTests: AdditionalTestInfo[];
    approving: boolean;
    rejecting: boolean;
    managing: boolean;
}

