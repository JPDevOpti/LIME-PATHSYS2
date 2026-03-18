'use client';

import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { CloseButton } from '@/shared/components/ui/buttons';
import { DonutSpinner } from '@/shared/components/ui/loading';
import type { Case } from '@/features/cases/types/case.types';
import { useState } from 'react';
import { CaseDetailsModal } from '@/features/cases/components/CaseDetailsModal';

type OutOfOpportunityCasesModalProps = {
    isOpen: boolean;
    onClose: () => void;
    cases: Case[];
    loading?: boolean;
    monthName?: string;
};

const formatDateTime = (value?: string) => {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';

    const parts = new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const day = parts.find((part) => part.type === 'day')?.value ?? '';
    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
    const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';

    return `${day} de ${month} ${hour}:${minute}`;
};

const formatPriority = (priority?: string) => {
    if (!priority) return 'Sin prioridad';
    if (priority.toLowerCase() === 'prioritario') return 'Prioritario';
    return 'Normal';
};

const formatDays = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return `${Math.round(value)} días`;
};

const formatMaxOpportunity = (value?: number) => {
    if (value === undefined || value === null) return 'No definida';
    return `${Math.round(value)} días`;
};

const formatDocument = (identificationType?: string, identificationNumber?: string) => {
    const type = (identificationType || '').trim();
    const number = (identificationNumber || '').trim();

    if (type && number) return `${type}-${number}`;
    if (number) return number;
    return 'Sin documento';
};

export const OutOfOpportunityCasesModal = ({
    isOpen,
    onClose,
    cases,
    loading = false,
    monthName,
}: OutOfOpportunityCasesModalProps) => {
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);

    const handleOpenCaseDetails = (caseItem: Case) => {
        setSelectedCase(caseItem);
    };

    const handleCloseCaseDetails = () => {
        setSelectedCase(null);
    };

    const handleCaseUpdated = (updatedCase: Case) => {
        setSelectedCase(updatedCase);
    };

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={onClose}
                size="full"
                className="max-w-[96vw]"
                title={
                    <div className="flex flex-col">
                        <span className="text-lg font-semibold text-neutral-900">Casos inoportunos</span>
                        <span className="text-sm font-normal text-neutral-500">
                            {monthName ? `${monthName} - ${cases.length} casos fuera de oportunidad` : `${cases.length} casos fuera de oportunidad`}
                        </span>
                    </div>
                }
                footer={<CloseButton onClick={onClose} size="sm" />}
            >
                {loading ? (
                    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4">
                        <DonutSpinner size="lg" />
                        <p className="text-sm text-neutral-500">Cargando casos inoportunos...</p>
                    </div>
                ) : cases.length === 0 ? (
                    <div className="flex min-h-[280px] items-center justify-center text-sm text-neutral-500">
                        No se encontraron casos fuera de oportunidad en el período.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-100 text-sm">
                            <thead className="bg-neutral-50/60">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                        Código
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                        Nombre y documento
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                        Patólogo asignado
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                        Ingreso / Firma
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                        Prioridad / Días
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                                        Oportunidad máxima
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 bg-white">
                                {cases.map((caseItem) => {
                                    const dateInfo = caseItem.date_info?.[0];
                                    const opportunityInfo = caseItem.opportunity_info?.[0];
                                    return (
                                        <tr
                                            key={caseItem.id}
                                            className="hover:bg-neutral-50/70 cursor-pointer"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleOpenCaseDetails(caseItem)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    handleOpenCaseDetails(caseItem);
                                                }
                                            }}
                                        >
                                            <td className="px-4 py-3 font-semibold text-neutral-900">
                                                {caseItem.case_code}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-neutral-900">
                                                        {caseItem.patient?.full_name || 'Sin nombre'}
                                                    </span>
                                                    <span className="text-xs text-neutral-500">
                                                        {formatDocument(
                                                            caseItem.patient?.identification_type,
                                                            caseItem.patient?.identification_number
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-neutral-700">
                                                {caseItem.assigned_pathologist?.name || 'Sin asignar'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-neutral-700">
                                                        {formatDateTime(dateInfo?.created_at)}
                                                    </span>
                                                    <span className="text-neutral-500">
                                                        {formatDateTime(dateInfo?.signed_at)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-neutral-700">
                                                        {formatPriority(caseItem.priority)}
                                                    </span>
                                                    <span className="text-rose-600 font-medium">
                                                        {formatDays(opportunityInfo?.opportunity_time)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-neutral-700">
                                                {formatMaxOpportunity(opportunityInfo?.max_opportunity_time)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </BaseModal>

            <CaseDetailsModal
                visible={!!selectedCase}
                caseData={selectedCase}
                onClose={handleCloseCaseDetails}
                onCaseUpdated={handleCaseUpdated}
            />
        </>
    );
};
