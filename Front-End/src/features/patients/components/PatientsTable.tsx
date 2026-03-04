'use client';

import Link from 'next/link';
import { Patient } from '../types/patient.types';
import type { PatientSortKey, SortOrder } from '../hooks/usePatientList';
import { BaseButton } from '@/shared/components/base';
import {
    Hash,
    User,
    Building2,
    Stethoscope,
    VenusAndMars,
    Calendar,
    Clock,
    Info,
    UserRoundPen,
    ClipboardPen
} from 'lucide-react';
import { formatAge } from '@/shared/utils/formatAge';
import { usePermissions } from '@/features/auth/hooks/usePermissions';

interface Column {
    key: PatientSortKey;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    class?: string;
}

const COLUMN_ICONS: Record<PatientSortKey, React.ComponentType<{ className?: string }>> = {
    patient_code: Hash,
    full_name: User,
    identification_number: Hash,
    entity: Building2,
    care_type: Stethoscope,
    gender: VenusAndMars,
    age: Clock,
    created_at: Calendar
};

interface PatientsTableProps {
    patients: Patient[];
    columns: Column[];
    sortKey: PatientSortKey;
    sortOrder: SortOrder;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    totalItems: number;
    noResultsMessage: string;
    onSort: (key: PatientSortKey) => void;
    onPrevPage: () => void;
    onNextPage: () => void;
    onItemsPerPageChange: (value: number) => void;
    onViewDetails?: (patient: Patient) => void;
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};


export function PatientsTable({
    patients,
    columns,
    sortKey,
    sortOrder,
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    noResultsMessage,
    onSort,
    onPrevPage,
    onNextPage,
    onItemsPerPageChange,
    onViewDetails
}: PatientsTableProps) {
    const { isPatologo } = usePermissions();

    return (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <div className="hidden lg:block max-w-full overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b border-neutral-200 bg-neutral-50">
                            {columns.map(col => {
                                const Icon = col.icon ?? COLUMN_ICONS[col.key];
                                return (
                                    <th
                                        key={col.key}
                                        className={`px-4 py-3 text-center font-medium text-neutral-600 ${col.class ?? ''}`}
                                    >
                                        <button
                                            type="button"
                                            className="flex items-center justify-center gap-1.5 w-full hover:text-neutral-900"
                                            onClick={() => onSort(col.key)}
                                        >
                                            {Icon && <Icon className="w-4 h-4" />}
                                            {col.label}
                                            {sortKey === col.key && (
                                                <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                                            )}
                                        </button>
                                    </th>
                                );
                            })}
                            <th className="px-4 py-3 text-center font-medium text-neutral-600 w-[140px]">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                        {patients.map(p => (
                            <tr key={p.id ?? p.patient_code} className="hover:bg-neutral-50">
                                <td className="px-4 py-3 text-center">
                                    <span className="font-medium text-neutral-900">
                                        {p.patient_code}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col gap-0.5 items-center">
                                        <p className="text-neutral-800">{p.full_name}</p>
                                        <p className="text-xs text-neutral-500">
                                            <span className="font-medium">{p.identification_type}</span>
                                            {'-'}
                                            {p.identification_number}
                                        </p>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center text-neutral-700">
                                    {p.entity_info?.entity_name ?? '-'}
                                </td>
                                <td className="px-4 py-3 text-center text-neutral-700">
                                    {p.care_type}
                                </td>
                                <td className="px-4 py-3 text-center text-neutral-700">
                                    {p.gender}
                                </td>
                                <td className="px-4 py-3 text-center text-neutral-700">
                                    {formatAge(p.age, p.birth_date) || '-'}
                                </td>
                                <td className="px-4 py-3 text-center text-neutral-600">
                                    {formatDate(p.created_at)}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-center gap-1">
                                        {onViewDetails ? (
                                            <button
                                                type="button"
                                                onClick={() => onViewDetails(p)}
                                                className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600"
                                                title="Ver detalles"
                                            >
                                                <Info className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <Link
                                                href={p.id ? `/patients/${p.id}/edit` : '#'}
                                                className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600"
                                                title="Ver detalles"
                                            >
                                                <Info className="w-4 h-4" />
                                            </Link>
                                        )}
                                        {!isPatologo && (
                                            <Link
                                                href={p.id ? `/patients/${p.id}/edit` : '#'}
                                                className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600"
                                                title="Editar"
                                            >
                                                <UserRoundPen className="w-4 h-4" />
                                            </Link>
                                        )}
                                        {!isPatologo && (
                                            <Link
                                                href={
                                                    p.id
                                                        ? `/cases/create?patientId=${p.id}`
                                                        : '/cases/create'
                                                }
                                                className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600"
                                                title="Crear caso"
                                            >
                                                <ClipboardPen className="w-4 h-4" />
                                            </Link>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {patients.length === 0 && (
                            <tr>
                                <td
                                    colSpan={columns.length + 1}
                                    className="px-4 py-12 text-center text-neutral-500"
                                >
                                    {noResultsMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="lg:hidden p-4 space-y-4">
                {patients.map(p => (
                    <div
                        key={p.id ?? p.patient_code}
                        className="bg-white border border-neutral-200 rounded-lg p-4"
                    >
                        <div className="flex flex-col gap-2 mb-3">
                            <h4 className="font-semibold text-neutral-800">{p.full_name}</h4>
                            <p className="text-sm text-neutral-600">
                                {p.patient_code} · {p.identification_type} {p.identification_number}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                            <div>
                                <p className="text-neutral-500">Entidad</p>
                                <p className="text-neutral-800">
                                    {p.entity_info?.entity_name ?? '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-neutral-500">Tipo atención</p>
                                <p className="text-neutral-800">{p.care_type}</p>
                            </div>
                            <div>
                                <p className="text-neutral-500">Sexo</p>
                                <p className="text-neutral-800">{p.gender}</p>
                            </div>
                            <div>
                                <p className="text-neutral-500">Edad</p>
                                <p className="text-neutral-800">{formatAge(p.age, p.birth_date) || '-'}</p>
                            </div>
                            <div>
                                <p className="text-neutral-500">Fecha creación</p>
                                <p className="text-neutral-800">{formatDate(p.created_at)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-neutral-100">
                            {onViewDetails ? (
                                <button
                                    type="button"
                                    onClick={() => onViewDetails(p)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 text-xs font-medium"
                                >
                                    <Info className="w-3 h-3" />
                                    Ver
                                </button>
                            ) : (
                                <Link
                                    href={p.id ? `/patients/${p.id}/edit` : '#'}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 text-xs font-medium"
                                >
                                    <Info className="w-3 h-3" />
                                    Ver
                                </Link>
                            )}
                            {!isPatologo && (
                                <Link
                                    href={p.id ? `/patients/${p.id}/edit` : '#'}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 text-xs font-medium"
                                >
                                    <UserRoundPen className="w-3 h-3" />
                                    Editar
                                </Link>
                            )}
                            {!isPatologo && (
                                <Link
                                    href={
                                        p.id ? `/cases/create?patientId=${p.id}` : '/cases/create'
                                    }
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 text-xs font-medium"
                                >
                                    <ClipboardPen className="w-3 h-3" />
                                    Caso
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
                {patients.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-neutral-500 text-sm">{noResultsMessage}</p>
                    </div>
                )}
            </div>

            <div className="px-4 py-3 border-t border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <span>Mostrando</span>
                    <select
                        value={itemsPerPage}
                        onChange={e =>
                            onItemsPerPageChange(
                                Number((e.target as HTMLSelectElement).value)
                            )
                        }
                        className="h-8 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-700"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={totalItems}>Todos</option>
                    </select>
                    <span>de {totalItems} resultados</span>
                </div>
                <div className="flex items-center gap-2">
                    <BaseButton
                        size="sm"
                        variant="secondary"
                        onClick={onPrevPage}
                        disabled={currentPage === 1}
                    >
                        Anterior
                    </BaseButton>
                    <span className="text-sm text-neutral-500">
                        Página {currentPage} de {totalPages}
                    </span>
                    <BaseButton
                        size="sm"
                        variant="secondary"
                        onClick={onNextPage}
                        disabled={currentPage === totalPages}
                    >
                        Siguiente
                    </BaseButton>
                </div>
            </div>
        </div>
    );
}
