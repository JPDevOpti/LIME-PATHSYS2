'use client';

import { useMemo } from 'react';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { BaseButton, BaseCard } from '@/shared/components/base';
import { exportJsonToExcel } from '@/shared/lib/exportExcel';
import type { BillingPathologistItem } from '../types/billing.types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

interface BillingPathologistTableProps {
    datos: BillingPathologistItem[];
}

export function BillingPathologistTable({ datos }: BillingPathologistTableProps) {
    const sorted = useMemo(
        () => [...datos].sort((a, b) => b.monto - a.monto),
        [datos]
    );

    const totalMonto = useMemo(() => datos.reduce((s, p) => s + p.monto, 0), [datos]);

    const exportToExcel = async () => {
        if (datos.length === 0) return;
        const data = datos.map((p) => ({
            Patólogo: p.nombre,
            Código: p.codigo,
            'Casos leídos': p.casos,
            'Monto generado': p.monto,
        }));
        const fileName = `facturacion_patologos_${new Date().toISOString().split('T')[0]}.xlsx`;
        await exportJsonToExcel(data, {
            sheetName: 'Facturacion por patologo',
            fileName,
        });
    };

    return (
        <BaseCard className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900">Detalle por patólogo</h3>
                    <p className="text-sm text-neutral-500 mt-1">
                        Tabla con el monto generado por cada patólogo.
                    </p>
                </div>
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
                                className="w-[40%] px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Patólogo
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Casos leídos
                            </th>
                            <th
                                scope="col"
                                className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider"
                            >
                                Monto generado
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                        {sorted.map((p) => (
                            <tr key={p.codigo} className="hover:bg-neutral-50 transition-colors">
                                <td className="w-[40%] px-6 py-4 whitespace-nowrap">
                                    <div>
                                        <span className="text-sm font-medium text-neutral-900">{p.nombre}</span>
                                        <div className="text-xs text-neutral-500">{p.codigo}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className="text-sm font-medium text-neutral-700">
                                        {p.casos}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <span className="text-sm font-semibold text-neutral-900">
                                        {formatCurrency(p.monto)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-neutral-50">
                        <tr>
                            <td className="w-[40%] px-6 py-4 text-sm font-bold text-neutral-900">Total</td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-neutral-900">
                                {datos.reduce((s, p) => s + (p.casos || 0), 0)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-bold text-neutral-900">
                                {formatCurrency(totalMonto)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </BaseCard>
    );
}
