'use client';

import { BaseButton } from '@/shared/components/base';
import { Info, ClipboardPen, CheckSquare } from 'lucide-react';
import type { UnreadCase } from '../types/unread-cases.types';

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 25, 50, 100];

function formatDate(s?: string): string {
    if (!s) return '-';
    try {
        return new Date(s).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return s;
    }
}

function getStatusClass(status?: string): string {
    if (status === 'Completado') return 'bg-green-100 text-green-800';
    if (status === 'En proceso') return 'bg-blue-100 text-blue-800';
    return 'bg-neutral-100 text-neutral-800';
}

function getTestTypeLabel(type: string): string {
    const map: Record<string, string> = {
        LOW_COMPLEXITY_IHQ: 'IHQ Baja',
        HIGH_COMPLEXITY_IHQ: 'IHQ Alta',
        SPECIAL_IHQ: 'IHQ Especial',
        HISTOCHEMISTRY: 'Histoquímica'
    };
    return map[type] || type;
}

function hasAnyTest(c: UnreadCase): boolean {
    if (c.testGroups?.length) return c.testGroups.some((g) => g.tests?.length);
    return !!(c.lowComplexityIHQ || c.highComplexityIHQ || c.specialIHQ || c.histochemistry);
}

interface UnreadCasesTableProps {
    cases: UnreadCase[];
    total: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    selectedIds: string[];
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (value: number) => void;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    onClearSelection: () => void;
    onViewDetails: (c: UnreadCase) => void;
    onEdit: (c: UnreadCase) => void;
    onManageDelivery: (c: UnreadCase) => void;
    onBatchMarkDelivered: () => void;
    noResultsMessage: string;
}

export function UnreadCasesTable({
    cases,
    total,
    currentPage,
    totalPages,
    itemsPerPage,
    selectedIds,
    onPageChange,
    onItemsPerPageChange,
    onToggleSelect,
    onToggleSelectAll,
    onClearSelection,
    onViewDetails,
    onEdit,
    onManageDelivery,
    onBatchMarkDelivered,
    noResultsMessage
}: UnreadCasesTableProps) {
    const isAllSelected = cases.length > 0 && cases.every((c) => selectedIds.includes(c.id));

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
                <p className="text-lg font-medium">{noResultsMessage}</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
            {selectedIds.length > 0 && (
                <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-blue-800">
                            {selectedIds.length} caso{selectedIds.length !== 1 ? 's' : ''} seleccionado
                            {selectedIds.length !== 1 ? 's' : ''}
                        </span>
                        <button
                            type="button"
                            onClick={onClearSelection}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                            Deseleccionar todo
                        </button>
                    </div>
                    <BaseButton
                        size="sm"
                        variant="secondary"
                        onClick={onBatchMarkDelivered}
                        startIcon={<CheckSquare className="w-4 h-4" />}
                    >
                        Marcar como completados
                    </BaseButton>
                </div>
            )}

            <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                    <tr>
                        <th className="px-4 py-3 text-center w-12">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={onToggleSelectAll}
                                className="rounded border-neutral-300"
                            />
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Código
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Paciente / Documento
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Institución
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Pruebas
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            N° Placas
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Ingreso / Entrega
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Estado
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                    {cases.map((c) => (
                        <tr
                            key={c.id}
                            className="hover:bg-neutral-50 transition-colors cursor-pointer"
                            onClick={() => onViewDetails(c)}
                        >
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(c.id)}
                                    onChange={() => onToggleSelect(c.id)}
                                    className="rounded border-neutral-300"
                                />
                            </td>
                            <td className="px-4 py-3 text-center">
                                <span className="text-sm font-medium text-neutral-900">{c.caseCode}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <p className="text-sm font-medium text-neutral-900">
                                    {c.patientName || (c.isSpecialCase ? 'Caso Especial' : '-')}
                                </p>
                                <p className="text-xs text-neutral-500">
                                    {c.patientDocument || (c.isSpecialCase ? 'Lab. Externo' : 'Sin documento')}
                                </p>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-neutral-700">
                                {c.institution || '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                                {hasAnyTest(c) ? (
                                    <div className="flex flex-wrap gap-1 justify-center max-w-[180px] mx-auto">
                                        {c.testGroups?.map((g, i) => (
                                            <span
                                                key={i}
                                                className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-800"
                                            >
                                                {getTestTypeLabel(g.type)}
                                            </span>
                                        )) || '-'}
                                    </div>
                                ) : (
                                    <span className="text-xs text-neutral-400">Sin pruebas</span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-center text-sm font-semibold text-neutral-900">
                                {c.numberOfPlates ?? 0}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-neutral-700">
                                <p>{formatDate(c.entryDate)}</p>
                                <p>{c.deliveryDate ? formatDate(c.deliveryDate) : 'Pendiente'}</p>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(c.status)}`}>
                                    {c.status || '-'}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => onViewDetails(c)}
                                        title="Ver detalles"
                                        className="p-1.5 rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
                                    >
                                        <Info className="w-3.5 h-3.5" />
                                    </button>
                                    {c.status !== 'Completado' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => onEdit(c)}
                                                title="Editar"
                                                className="p-1.5 rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm text-blue-600 hover:bg-blue-50 transition-colors"
                                            >
                                                <ClipboardPen className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onManageDelivery(c)}
                                                title="Gestionar entrega"
                                                className="p-1.5 rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm text-green-600 hover:bg-green-50 transition-colors"
                                            >
                                                <CheckSquare className="w-3.5 h-3.5" />
                                            </button>
                                        </>
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
