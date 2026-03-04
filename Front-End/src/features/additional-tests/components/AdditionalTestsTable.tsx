'use client';

import { BaseButton } from '@/shared/components/base';
import { Info, ClipboardCheck, Check, X } from 'lucide-react';
import { formatDate, getStatusText, getStatusClasses } from '../utils/approval-adapter';
import type { CaseToApproveViewModel } from '../types/cases-approval.types';

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100];

interface AdditionalTestsTableProps {
    cases: CaseToApproveViewModel[];
    total: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (value: number) => void;
    onViewDetails: (caseId: string) => void;
    onManage: (approvalCode: string) => void;
    onApprove: (approvalCode: string) => void;
    onReject: (approvalCode: string) => void;
}

function getPathologistName(c: CaseToApproveViewModel) {
    return c.pathologistName && c.pathologistName !== 'Sin asignar' ? c.pathologistName : 'Sin asignar';
}

export function AdditionalTestsTable({
    cases,
    total,
    currentPage,
    totalPages,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    onViewDetails,
    onManage,
    onApprove,
    onReject
}: AdditionalTestsTableProps) {
    if (cases.length === 0) {
        return (
            <div className="text-center py-12 text-neutral-500">
                <svg
                    className="w-12 h-12 mx-auto mb-4 text-neutral-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
                <p className="text-lg font-medium">No hay pruebas adicionales</p>
                <p className="text-sm mt-1">No hay pruebas adicionales registradas.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                    <tr>
                        <th
                            scope="col"
                            className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                        >
                            Código de referencia
                        </th>
                        <th
                            scope="col"
                            className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                        >
                            Patólogo
                        </th>
                        <th
                            scope="col"
                            className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                        >
                            Estado
                        </th>
                        <th
                            scope="col"
                            className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                        >
                            Fecha
                        </th>
                        <th
                            scope="col"
                            className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                        >
                            Pruebas
                        </th>
                        <th
                            scope="col"
                            className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                        >
                            Motivo
                        </th>
                        <th
                            scope="col"
                            className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                        >
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                    {cases.map((caseItem) => (
                        <tr key={caseItem.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className="text-sm font-medium text-neutral-900">{caseItem.caseCode}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-700 text-center">
                                {getPathologistName(caseItem)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className={getStatusClasses(caseItem.status)}>
                                    {getStatusText(caseItem.status)}
                                </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-700 text-center">
                                {formatDate(caseItem.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-center">
                                <div className="flex flex-wrap gap-1 max-w-[200px] mx-auto justify-center">
                                    {caseItem.additionalTests?.length ? (
                                        caseItem.additionalTests.map((t, i) => (
                                            <span
                                                key={i}
                                                className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800"
                                            >
                                                {t.code}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-neutral-400">-</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3 max-w-[180px] text-center">
                                <p className="text-xs text-neutral-700 line-clamp-2" title={caseItem.description || ''}>
                                    {caseItem.description || 'Sin motivo especificado'}
                                </p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => onViewDetails(caseItem.id)}
                                        disabled={caseItem.approving || caseItem.rejecting || caseItem.managing}
                                        title="Ver detalles"
                                        className="p-1.5 rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Info className="w-3.5 h-3.5" />
                                    </button>
                                    {caseItem.status === 'request_made' && (
                                        <button
                                            type="button"
                                            onClick={() => onManage(caseItem.approvalCode)}
                                            disabled={caseItem.rejecting || caseItem.approving}
                                            title="Revisar"
                                            className="p-1.5 rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm text-orange-600 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ClipboardCheck className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {caseItem.status === 'pending_approval' && (
                                        <button
                                            type="button"
                                            onClick={() => onApprove(caseItem.approvalCode)}
                                            disabled={caseItem.rejecting}
                                            title="Aprobar"
                                            className="p-1.5 rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {(caseItem.status === 'request_made' || caseItem.status === 'pending_approval') && (
                                        <button
                                            type="button"
                                            onClick={() => onReject(caseItem.approvalCode)}
                                            disabled={caseItem.approving || caseItem.managing}
                                            title="Rechazar"
                                            className="p-1.5 rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {total > 0 && (
                <div className="px-4 py-3 border-t border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <span>Mostrando</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                            className="h-8 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-700"
                        >
                            {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                            <option value={total}>Todos</option>
                        </select>
                        <span>de {total} resultados</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <BaseButton
                            variant="secondary"
                            size="sm"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            Anterior
                        </BaseButton>
                        <span className="text-sm text-neutral-500">
                            Página {currentPage} de {totalPages}
                        </span>
                        <BaseButton
                            variant="secondary"
                            size="sm"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Siguiente
                        </BaseButton>
                    </div>
                </div>
            )}
        </div>
    );
}
