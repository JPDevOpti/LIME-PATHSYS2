'use client';

import { BaseCard, BaseButton } from '@/shared/components/base';
import { UserRoundPen, UserRoundX, UserRoundPlus } from 'lucide-react';
import type { Profile, ProfileRole } from '../types/profile.types';

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100];

const ROLE_LABELS: Record<ProfileRole, string> = {
    administrador: 'Administrador',
    patologo: 'Patologo',
    residente: 'Residente',
    recepcionista: 'Auxiliar',
    visitante: 'Visitante',
    paciente: 'Paciente',
};

const ROLE_STYLES: Record<ProfileRole, string> = {
    administrador: 'bg-violet-100 text-violet-800',
    patologo: 'bg-emerald-100 text-emerald-800',
    residente: 'bg-amber-100 text-amber-800',
    recepcionista: 'bg-sky-100 text-sky-800',
    visitante: 'bg-orange-100 text-orange-800',
    paciente: 'bg-blue-100 text-blue-800',
};

interface ProfilesTableProps {
    profiles: Profile[];
    total: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (n: number) => void;
    onEdit: (profile: Profile) => void;
    onInactivate: (profile: Profile) => void;
    onActivate: (profile: Profile) => void;
    noResultsMessage?: string;
}

export function ProfilesTable({
    profiles,
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
}: ProfilesTableProps) {
    if (profiles.length === 0) {
        return (
            <BaseCard className="p-6">
                <div className="text-center py-12 text-neutral-500">
                    <p className="text-sm">{noResultsMessage ?? 'No hay perfiles creados. Cree uno nuevo para comenzar.'}</p>
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
                                className="w-[25%] px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Perfil
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
                                Correo
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Rol
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
                        {profiles.map((p) => (
                            <tr
                                key={p.id || `${p.role}-${p.email || ''}-${p.code || ''}-${p.name || ''}`}
                                className="hover:bg-neutral-50 transition-colors"
                            >
                                <td className="w-[25%] px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm font-medium text-neutral-900">{p.name}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-neutral-700">{p.code ?? '-'}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-neutral-700">{p.email ?? '-'}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[p.role] ?? 'bg-neutral-100 text-neutral-700'}`}
                                    >
                                        {ROLE_LABELS[p.role]}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${p.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-600'
                                            }`}
                                    >
                                        {p.isActive !== false ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(p)}
                                            title="Editar"
                                            className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 shadow-sm text-blue-600 hover:bg-blue-100 transition-colors"
                                        >
                                            <UserRoundPen className="w-3.5 h-3.5" />
                                        </button>
                                        {p.isActive !== false ? (
                                            <button
                                                type="button"
                                                onClick={() => onInactivate(p)}
                                                title="Inactivar"
                                                className="p-1.5 rounded-lg border border-red-200 bg-red-50 shadow-sm text-red-600 hover:bg-red-100 transition-colors"
                                            >
                                                <UserRoundX className="w-3.5 h-3.5" />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => onActivate(p)}
                                                title="Activar"
                                                className="p-1.5 rounded-lg border border-green-200 bg-green-50 shadow-sm text-green-600 hover:bg-green-100 transition-colors"
                                            >
                                                <UserRoundPlus className="w-3.5 h-3.5" />
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
