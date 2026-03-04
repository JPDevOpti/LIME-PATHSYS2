import { apiClient } from '@/shared/api/client';
import type {
    ApprovalRequestResponse,
    ApprovalRequestSearch,
    AdditionalTestInfo
} from '../types/cases-approval.types';

function mapApiToApproval(api: Record<string, unknown>): ApprovalRequestResponse {
    const approvalInfo = api.approval_info as Record<string, unknown> | undefined;
    const ct = ((api.additional_tests as unknown[]) || (api.complementary_tests as unknown[]) || []);
    return {
        id: String(api.id ?? ''),
        approval_code: String(api.approval_code ?? api.original_case_code ?? ''),
        original_case_code: String(api.original_case_code ?? api.approval_code ?? ''),
        approval_state: (api.approval_state as ApprovalRequestResponse['approval_state']) ?? 'request_made',
        entity: api.entity != null ? String(api.entity) : undefined,
        additional_tests: ct.map((t) => ({
            code: String((t as Record<string, unknown>).code ?? ''),
            name: String((t as Record<string, unknown>).name ?? ''),
            quantity: Number((t as Record<string, unknown>).quantity ?? 1)
        })),
        approval_info: {
            reason: approvalInfo?.reason != null ? String(approvalInfo.reason) : '',
            request_date: approvalInfo?.request_date != null ? String(approvalInfo.request_date) : '',
            assigned_pathologist: approvalInfo?.assigned_pathologist as ApprovalRequestResponse['approval_info']['assigned_pathologist']
        },
        created_at: String(api.created_at ?? ''),
        updated_at: String(api.updated_at ?? '')
    };
}

export const casesApprovalService = {
    async search(
        params: ApprovalRequestSearch,
        skip: number,
        limit: number
    ): Promise<{ data: ApprovalRequestResponse[]; total: number; skip: number; limit: number }> {
        const query: Record<string, string | number> = { skip, limit };
        if (params.original_case_code) query.case_code = params.original_case_code;
        if (params.approval_state) query.approval_state = params.approval_state;
        if (params.entity) query.entity = params.entity;
        if (params.pathologist_id) query.pathologist_id = params.pathologist_id;
        if (params.test_code) query.test_code = params.test_code;
        if (params.request_date_from) query.created_at_from = params.request_date_from;
        if (params.request_date_to) query.created_at_to = params.request_date_to;

        const res = await apiClient.get<{ data: unknown[]; total: number }>(
            '/api/v1/additional-tests',
            query
        );
        const data = (res.data || []).map((d) => mapApiToApproval(d as Record<string, unknown>));
        return { data, total: res.total ?? 0, skip, limit };
    },

    async getByCode(approvalCode: string): Promise<ApprovalRequestResponse | null> {
        try {
            const api = await apiClient.get<Record<string, unknown>>(
                `/api/v1/additional-tests/${encodeURIComponent(approvalCode.trim())}`
            );
            return mapApiToApproval(api);
        } catch {
            return null;
        }
    },

    async manage(approvalCode: string): Promise<ApprovalRequestResponse> {
        const api = await apiClient.put<Record<string, unknown>>(
            `/api/v1/additional-tests/${encodeURIComponent(approvalCode.trim())}/manage`,
            {}
        );
        return mapApiToApproval(api);
    },

    async approve(
        approvalCode: string
    ): Promise<{ data: { new_case: unknown }; approval: ApprovalRequestResponse }> {
        const api = await apiClient.put<Record<string, unknown>>(
            `/api/v1/additional-tests/${encodeURIComponent(approvalCode.trim())}/approve`,
            {}
        );
        return {
            data: api.data as { new_case: unknown },
            approval: mapApiToApproval((api.approval || api) as Record<string, unknown>)
        };
    },

    async reject(approvalCode: string): Promise<ApprovalRequestResponse> {
        const api = await apiClient.put<Record<string, unknown>>(
            `/api/v1/additional-tests/${encodeURIComponent(approvalCode.trim())}/reject`,
            {}
        );
        return mapApiToApproval(api);
    },

    async updateTests(
        approvalCode: string,
        additionalTests: AdditionalTestInfo[]
    ): Promise<ApprovalRequestResponse> {
        const api = await apiClient.put<Record<string, unknown>>(
            `/api/v1/additional-tests/${encodeURIComponent(approvalCode.trim())}/tests`,
            { additional_tests: additionalTests }
        );
        return mapApiToApproval(api);
    }
};
