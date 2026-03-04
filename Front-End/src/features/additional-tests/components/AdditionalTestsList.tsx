'use client';

import { useState, useEffect, useCallback } from 'react';
import { BaseCard } from '@/shared/components/base';
import { ConfirmDialog } from '@/shared/components/overlay/ConfirmDialog';
import { AdditionalTestsDetailsModal } from './AdditionalTestsDetailsModal';
import { AdditionalTestsSuccessModal, type ApprovalSuccessCaseData } from './AdditionalTestsSuccessModal';
import { AdditionalTestsFilters, type ApprovalFilters } from './AdditionalTestsFilters';
import { AdditionalTestsTable } from './AdditionalTestsTable';
import { casesApprovalService } from '../services/additional-tests.service';
import { toViewModelList } from '../utils/approval-adapter';
import type {
    CaseToApproveViewModel,
    ApprovalRequestResponse,
    AdditionalTestInfo,
    ApprovalState
} from '../types/cases-approval.types';

const INITIAL_FILTERS: ApprovalFilters = {
    searchTerm: '',
    status: '',
    entity: '',
    pathologist: '',
    test: '',
    dateFrom: '',
    dateTo: ''
};

export function AdditionalTestsList() {
    const [filters, setFilters] = useState<ApprovalFilters>(INITIAL_FILTERS);
    const [loading, setLoading] = useState(false);
    const [cases, setCases] = useState<CaseToApproveViewModel[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const [selectedCase, setSelectedCase] = useState<ApprovalRequestResponse | null>(null);
    const [showConfirmManage, setShowConfirmManage] = useState(false);
    const [showConfirmApprove, setShowConfirmApprove] = useState(false);
    const [showConfirmReject, setShowConfirmReject] = useState(false);
    const [confirmData, setConfirmData] = useState<{
        caseId: string;
        caseCode: string;
        approvalCode: string;
        loading: boolean;
    } | null>(null);
    const [approvedCaseData, setApprovedCaseData] = useState<ApprovalSuccessCaseData | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const fetchCases = useCallback(async (filterOverride?: ApprovalFilters, pageOverride?: number, limitOverride?: number) => {
        setLoading(true);
        try {
            const f = filterOverride || filters;
            const p = pageOverride !== undefined ? pageOverride : currentPage;
            const l = limitOverride !== undefined ? limitOverride : itemsPerPage;
            const resp = await casesApprovalService.search(
                {
                    original_case_code: f.searchTerm.trim() || undefined,
                    approval_state: (f.status || undefined) as ApprovalState | undefined,
                    entity: f.entity || undefined,
                    pathologist_id: f.pathologist || undefined,
                    test_code: f.test || undefined,
                    request_date_from: f.dateFrom || undefined,
                    request_date_to: f.dateTo || undefined
                },
                (p - 1) * l,
                l
            );
            setCases(toViewModelList(resp.data));
            setTotal(resp.total);
        } catch (e) {
            console.error('Error fetching cases:', e);
            setCases([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, filters]);

    useEffect(() => {
        fetchCases();
    }, [fetchCases]);

    const totalPages = Math.ceil(total / itemsPerPage);

    const handleSearch = () => {
        setCurrentPage(1);
        fetchCases(filters, 1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        fetchCases(filters, page);
    };

    const handleItemsPerPageChange = (value: number) => {
        setItemsPerPage(value);
        setCurrentPage(1);
        fetchCases(filters, 1, value);
    };

    const viewCase = async (caseId: string) => {
        const localCase = cases.find((c) => c.id === caseId);
        if (!localCase) return;
        try {
            const detail = await casesApprovalService.getByCode(localCase.approvalCode);
            setSelectedCase(detail || null);
        } catch {
            setSelectedCase({
                id: localCase.id,
                approval_code: localCase.approvalCode,
                original_case_code: localCase.caseCode,
                approval_state: localCase.status,
                additional_tests: localCase.additionalTests,
                approval_info: { reason: localCase.description || '', request_date: localCase.createdAt },
                created_at: localCase.createdAt,
                updated_at: localCase.updatedAt
            } as ApprovalRequestResponse);
        }
    };

    const closeModal = () => setSelectedCase(null);

    const openManageConfirm = (approvalCode: string) => {
        const caseItem = cases.find((c) => c.approvalCode === approvalCode);
        if (!caseItem) return;
        setConfirmData({
            caseId: caseItem.id,
            caseCode: caseItem.caseCode,
            approvalCode,
            loading: false
        });
        setShowConfirmManage(true);
    };

    const openApproveConfirm = (approvalCode: string) => {
        const caseItem = cases.find((c) => c.approvalCode === approvalCode);
        if (!caseItem) return;
        setConfirmData({
            caseId: caseItem.id,
            caseCode: caseItem.caseCode,
            approvalCode,
            loading: false
        });
        setShowConfirmApprove(true);
    };

    const openRejectConfirm = (approvalCode: string) => {
        const caseItem = cases.find((c) => c.approvalCode === approvalCode);
        if (!caseItem) return;
        setConfirmData({
            caseId: caseItem.id,
            caseCode: caseItem.caseCode,
            approvalCode,
            loading: false
        });
        setShowConfirmReject(true);
    };

    const cancelConfirm = () => {
        setShowConfirmManage(false);
        setShowConfirmApprove(false);
        setShowConfirmReject(false);
        setConfirmData(null);
    };

    const confirmManage = async () => {
        if (!confirmData) return;
        setConfirmData((prev) => (prev ? { ...prev, loading: true } : null));
        try {
            await casesApprovalService.manage(confirmData.approvalCode);
            await fetchCases();
            setShowConfirmManage(false);
            setConfirmData(null);
            if (selectedCase?.approval_code === confirmData.approvalCode) closeModal();
        } catch (e) {
            console.error('Error managing case:', e);
        } finally {
            setConfirmData((prev) => (prev ? { ...prev, loading: false } : null));
        }
    };

    const confirmApprove = async () => {
        if (!confirmData) return;
        const caseItem = cases.find((c) => c.id === confirmData.caseId);
        if (!caseItem) return;
        setConfirmData((prev) => (prev ? { ...prev, loading: true } : null));
        try {
            const result = await casesApprovalService.approve(confirmData.approvalCode);
            await fetchCases();
            setShowConfirmApprove(false);
            setConfirmData(null);
            const raw = result?.data?.new_case as Record<string, unknown> | null;
            const pi = raw?.patient_info as Record<string, unknown> | undefined;
            const fullName = pi?.full_name ?? pi?.first_name ?? caseItem.patientName;
            setApprovedCaseData(
                raw
                    ? {
                          code: String(raw.case_code ?? ''),
                          original_case_code: caseItem.caseCode,
                          patient: { name: String(fullName ?? 'N/D') },
                                                    additional_tests: (raw.additional_tests as { code: string; name: string; quantity: number }[]) || [],
                          created_at: raw.created_at != null ? String(raw.created_at) : undefined,
                          state: 'approved'
                      }
                    : {
                          original_case_code: caseItem.caseCode,
                          patient: { name: caseItem.patientName },
                                                    additional_tests: caseItem.additionalTests || [],
                          state: 'approved',
                          created_at: new Date().toISOString()
                      }
            );
            setShowSuccessModal(true);
            if (selectedCase?.approval_code === confirmData.approvalCode) closeModal();
        } catch (e) {
            console.error('Error approving case:', e);
        } finally {
            setConfirmData((prev) => (prev ? { ...prev, loading: false } : null));
        }
    };

    const confirmReject = async () => {
        if (!confirmData) return;
        setConfirmData((prev) => (prev ? { ...prev, loading: true } : null));
        try {
            await casesApprovalService.reject(confirmData.approvalCode);
            await fetchCases();
            setShowConfirmReject(false);
            setConfirmData(null);
            if (selectedCase?.approval_code === confirmData.approvalCode) closeModal();
        } catch (e) {
            console.error('Error rejecting case:', e);
        } finally {
            setConfirmData((prev) => (prev ? { ...prev, loading: false } : null));
        }
    };

    const handleClear = () => {
        setFilters(INITIAL_FILTERS);
        setCurrentPage(1);
        fetchCases(INITIAL_FILTERS, 1);
    };

    const handleTestsUpdated = async (updatedTests: AdditionalTestInfo[]) => {
        if (!selectedCase?.approval_code) return;
        try {
            await casesApprovalService.updateTests(selectedCase.approval_code, updatedTests);
            setSelectedCase(prev => prev ? { ...prev, additional_tests: updatedTests } : null);
            await fetchCases();
        } catch (e) {
            console.error('Error updating tests:', e);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-4">
                <AdditionalTestsFilters
                    filters={filters}
                    onFiltersChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
                    onSearch={handleSearch}
                    onClear={handleClear}
                    loading={loading}
                />

                <BaseCard variant="default" padding="none" className="overflow-hidden">
                    <AdditionalTestsTable
                        cases={cases}
                        total={total}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        onViewDetails={viewCase}
                        onManage={openManageConfirm}
                        onApprove={openApproveConfirm}
                        onReject={openRejectConfirm}
                    />
                </BaseCard>
            </div>

            <AdditionalTestsDetailsModal
                caseItem={selectedCase}
                onClose={closeModal}
                onTestsUpdated={handleTestsUpdated}
            />

            <ConfirmDialog
                isOpen={showConfirmManage}
                onClose={cancelConfirm}
                title="Confirmar revision"
                message={`Desea marcar la solicitud de pruebas adicionales ${confirmData?.caseCode} como 'En revision'?`}
                confirmText="Sí, revisar"
                cancelText="Cancelar"
                loading={confirmData?.loading || false}
                onConfirm={confirmManage}
                onCancel={cancelConfirm}
            />

            <ConfirmDialog
                isOpen={showConfirmApprove}
                onClose={cancelConfirm}
                title="Confirmar"
                message={`¿Desea aprobar definitivamente la solicitud de pruebas adicionales ${confirmData?.caseCode}?`}
                confirmText="Sí, aprobar"
                cancelText="Cancelar"
                loading={confirmData?.loading || false}
                onConfirm={confirmApprove}
                onCancel={cancelConfirm}
            />

            <ConfirmDialog
                isOpen={showConfirmReject}
                onClose={cancelConfirm}
                title="Confirmar rechazo"
                message={`Desea rechazar la solicitud de pruebas adicionales ${confirmData?.caseCode}?`}
                confirmText="Sí, rechazar"
                cancelText="Cancelar"
                loading={confirmData?.loading || false}
                onConfirm={confirmReject}
                onCancel={cancelConfirm}
                variant="danger"
            />

            <AdditionalTestsSuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                caseData={approvedCaseData}
            />
        </>
    );
}
