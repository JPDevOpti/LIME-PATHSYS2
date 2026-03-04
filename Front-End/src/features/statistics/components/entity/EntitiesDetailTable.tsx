'use client';

import { useMemo } from 'react';
import { ChevronRightIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { BaseButton } from '@/shared/components/base';
import { exportJsonToExcel } from '@/shared/lib/exportExcel';
import type { EntityStats } from '../../types/entities.types';

interface EntitiesDetailTableProps {
    datos: EntityStats[];
    onEntityClick?: (entity: EntityStats) => void;
}

export function EntitiesDetailTable({ datos, onEntityClick }: EntitiesDetailTableProps) {
    const sortedEntities = useMemo(
        () => [...datos].sort((a, b) => b.total - a.total),
        [datos]
    );

    const totalPacientes = useMemo(() => datos.reduce((s, e) => s + e.total, 0), [datos]);
    const totalAmbulatorios = useMemo(() => datos.reduce((s, e) => s + e.ambulatorios, 0), [datos]);
    const totalHospitalizados = useMemo(() => datos.reduce((s, e) => s + e.hospitalizados, 0), [datos]);
    const totalDentro = useMemo(() => datos.reduce((s, e) => s + e.dentroOportunidad, 0), [datos]);
    const totalFuera = useMemo(() => datos.reduce((s, e) => s + e.fueraOportunidad, 0), [datos]);
    const pctCumplimientoTotal = useMemo(() => {
        const sum = totalDentro + totalFuera;
        return sum > 0 ? Math.round((totalDentro / sum) * 100) : 0;
    }, [totalDentro, totalFuera]);

    const pctCumplimiento = (e: EntityStats) => {
        const sum = e.dentroOportunidad + e.fueraOportunidad;
        return sum > 0 ? Math.round((e.dentroOportunidad / sum) * 100) : 0;
    };

    const exportToExcel = async () => {
        if (datos.length === 0) return;
        const data = datos.map((e) => ({
            Entidad: e.nombre,
            'Porcentaje cumplimiento': `${pctCumplimiento(e)}%`,
            Ambulatorios: e.ambulatorios,
            Hospitalizados: e.hospitalizados,
            Total: e.total,
        }));
        const fileName = `entidades_${new Date().toISOString().split('T')[0]}.xlsx`;
        await exportJsonToExcel(data, {
            sheetName: 'Entidades',
            fileName,
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">Entidades</h3>
                {datos.length > 0 && (
                    <BaseButton size="sm" variant="secondary" onClick={exportToExcel}>
                        <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                        Exportar Excel
                    </BaseButton>
                )}
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                        <tr>
                            <th
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Entidad
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                % Cumplimiento
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Ambulatorios
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Hospitalizados
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                        {sortedEntities.map((entity) => (
                            <tr
                                key={entity.codigo}
                                className="hover:bg-neutral-50 transition-colors cursor-pointer"
                                onClick={() => onEntityClick?.(entity)}
                                title="Clic para ver detalles"
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-neutral-900">
                                            {entity.nombre}
                                        </span>
                                        <ChevronRightIcon className="w-4 h-4 text-neutral-400" />
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span
                                        className={`text-sm font-semibold ${
                                            pctCumplimiento(entity) >= 80
                                                ? 'text-green-600'
                                                : pctCumplimiento(entity) >= 60
                                                  ? 'text-amber-600'
                                                  : 'text-red-600'
                                        }`}
                                    >
                                        {pctCumplimiento(entity)}%
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className="text-sm font-semibold text-green-600">
                                        {entity.ambulatorios.toLocaleString()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className="text-sm font-semibold text-blue-600">
                                        {entity.hospitalizados.toLocaleString()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className="text-sm font-bold text-neutral-900">
                                        {entity.total.toLocaleString()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-neutral-50">
                        <tr>
                            <td className="px-6 py-4 text-sm font-bold text-neutral-900">Total</td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-neutral-900">
                                {pctCumplimientoTotal}%
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-green-600">
                                {totalAmbulatorios.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-blue-600">
                                {totalHospitalizados.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-neutral-900">
                                {totalPacientes.toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
