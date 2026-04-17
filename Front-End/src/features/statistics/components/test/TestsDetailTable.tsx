'use client';

import { useMemo } from 'react';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { BaseButton } from '@/shared/components/base';
import { exportJsonToExcel } from '@/shared/utils/exportExcel';
import type { TestStats } from '../../types/statistics.types';

interface TestsDetailTableProps {
    datos: TestStats[];
}

export function TestsDetailTable({ datos }: TestsDetailTableProps) {
    const sortedTests = useMemo(
        () => [...datos].sort((a, b) => b.total - a.total),
        [datos]
    );

    const totalAmbulatorios = useMemo(() => datos.reduce((s, t) => s + t.ambulatorios, 0), [datos]);
    const totalHospitalizados = useMemo(() => datos.reduce((s, t) => s + t.hospitalizados, 0), [datos]);
    const totalCasos = useMemo(() => datos.reduce((s, t) => s + t.total, 0), [datos]);

    const exportToExcel = async () => {
        if (datos.length === 0) return;
        const data = datos.map((t) => ({
            Prueba: t.nombre,
            Codigo: t.codigo,
            Ambulatorios: t.ambulatorios,
            Hospitalizados: t.hospitalizados,
            Total: t.total,
        }));
        const fileName = `pruebas_${new Date().toISOString().split('T')[0]}.xlsx`;
        await exportJsonToExcel(data, {
            sheetName: 'Pruebas',
            fileName,
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900">Pruebas</h3>
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
                                className="w-[60%] px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Prueba
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
                        {sortedTests.map((test) => (
                            <tr key={test.codigo} className="hover:bg-neutral-50 transition-colors">
                                <td className="w-[60%] px-6 py-4 whitespace-nowrap">
                                    <div>
                                        <span className="text-sm font-medium text-neutral-900">{test.nombre}</span>
                                        <div className="text-xs text-neutral-500">{test.codigo}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className="text-sm font-semibold text-green-600">
                                        {test.ambulatorios.toLocaleString()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className="text-sm font-semibold text-blue-600">
                                        {test.hospitalizados.toLocaleString()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className="text-sm font-bold text-neutral-900">
                                        {test.total.toLocaleString()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-neutral-50">
                        <tr>
                            <td className="w-[60%] px-6 py-4 text-sm font-bold text-neutral-900">Total</td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-green-600">
                                {totalAmbulatorios.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-blue-600">
                                {totalHospitalizados.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-neutral-900">
                                {totalCasos.toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
                El pie suma unidades de prueba (quantity y repeticiones entre muestras). Un mismo caso puede
                aportar a varias filas si tiene varios códigos de prueba.
            </p>
        </div>
    );
}
