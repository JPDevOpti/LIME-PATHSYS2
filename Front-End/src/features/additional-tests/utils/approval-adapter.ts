import type {
    ApprovalRequestResponse,
    ApprovalState,
    CaseToApproveViewModel
} from '../types/cases-approval.types';

export function toViewModel(dto: ApprovalRequestResponse): CaseToApproveViewModel {
    return {
        id: dto.id,
        approvalCode: dto.approval_code,
        caseCode: dto.original_case_code,
        patientName: `Caso ${dto.original_case_code}`,
        pathologistName: dto.approval_info?.assigned_pathologist?.name || 'Unassigned',
        pathologistId: dto.approval_info?.assigned_pathologist?.id || '',
        description: dto.approval_info?.reason || 'Sin motivo especificado',
        createdAt: dto.created_at,
        updatedAt: dto.updated_at,
        status: dto.approval_state,
        additionalTests: dto.additional_tests || [],
        approving: false,
        rejecting: false,
        managing: false
    };
}

export function toViewModelList(dtos: ApprovalRequestResponse[]): CaseToApproveViewModel[] {
    return dtos.map(toViewModel);
}

export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function getStatusText(status: ApprovalState): string {
    const map: Record<ApprovalState, string> = {
        request_made: 'Solicitado',
        pending_approval: 'En revision',
        approved: 'Aprobado',
        rejected: 'Rechazado'
    };
    return map[status] || status;
}

export function getStatusClasses(status: ApprovalState): string {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const colors: Record<ApprovalState, string> = {
        request_made: 'bg-blue-100 text-blue-800',
        pending_approval: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800'
    };
    return `${base} ${colors[status] || 'bg-neutral-100 text-neutral-800'}`;
}
