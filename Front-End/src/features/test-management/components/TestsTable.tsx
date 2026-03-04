'use client';

import { BaseCard, BaseButton } from '@/shared/components/base';
import { ClipboardPen, FlaskConical, FlaskConicalOff } from 'lucide-react';
import type { LabTest } from '../types/lab-tests.types';

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100];

interface TestsTableProps {
    tests: LabTest[];
    total: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (value: number) => void;
    onEdit: (test: LabTest) => void;
    onInactivate: (test: LabTest) => void;
    onActivate: (test: LabTest) => void;
    noResultsMessage?: string;
}

function formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(price);
}

export function TestsTable({
    tests,
    total,
    currentPage,
    totalPages,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    onEdit,
    onInactivate,
    onActivate,
    noResultsMessage,
}: TestsTableProps) {
    if (tests.length === 0) {
        return (
            <BaseCard className="p-6">
                <div className="text-center py-12 text-neutral-500">
                    <p className="text-sm">{noResultsMessage ?? 'No hay pruebas creadas. Cree una nueva para comenzar.'}</p>
                </div>
            </BaseCard>
        );
    }

    return (
        <BaseCard className="p-6">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                        <tr>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Nombre
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Codigo
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Descripcion
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Tiempo (dias)
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Precio
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Estado
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                        {tests.map((t) => (
                            <tr key={t.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="text-sm font-medium text-neutral-900">{t.name}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-neutral-700 font-mono">{t.test_code}</span>
                                </td>
                                <td className="px-6 py-4 max-w-[200px]">
                                    <span className="text-sm text-neutral-700 line-clamp-2">{t.description || '-'}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className="text-sm text-neutral-700">{t.time}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-neutral-700">{formatPrice(t.price)}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            t.is_active ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-600'
                                        }`}
                                    >
                                        {t.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(t)}
                                            title="Editar"
                                            className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 shadow-sm text-blue-600 hover:bg-blue-100 transition-colors"
                                        >
                                            <ClipboardPen className="w-3.5 h-3.5" />
                                        </button>
                                        {t.is_active ? (
                                            <button
                                                type="button"
                                                onClick={() => onInactivate(t)}
                                                title="Inactivar"
                                                className="p-1.5 rounded-lg border border-red-200 bg-red-50 shadow-sm text-red-600 hover:bg-red-100 transition-colors"
                                            >
                                                <FlaskConicalOff className="w-3.5 h-3.5" />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => onActivate(t)}
                                                title="Activar"
                                                className="p-1.5 rounded-lg border border-green-200 bg-green-50 shadow-sm text-green-600 hover:bg-green-100 transition-colors"
                                            >
                                                <FlaskConical className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {total > 0 && (
                <div className="px-4 py-3 mt-4 border-t border-neutral-200 bg-neutral-50 rounded-b-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                            Pagina {currentPage} de {totalPages}
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
        </BaseCard>
    );
}
