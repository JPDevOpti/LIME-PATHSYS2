'use client';

import { useMemo } from 'react';
import { BaseCard } from '@/shared/components/base';
import { BaseBarChart } from '@/shared/components/data-visualization';
import { UserCircle } from 'lucide-react';
import type { BillingPathologistItem } from '../types/billing.types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatCurrencyShort = (value: number) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return formatCurrency(value);
};

const truncateName = (name: string, maxLength: number = 16) => {
    if (typeof name !== 'string') return name;
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name;
};

interface BillingPathologistChartProps {
    datos: BillingPathologistItem[];
}

export function BillingPathologistChart({ datos }: BillingPathologistChartProps) {
    const chartData = useMemo(() => {
        return datos.map((p) => ({
            name: p.nombre,
            monto: p.monto,
        }));
    }, [datos]);

    return (
        <BaseCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <UserCircle className="h-5 w-5 text-lime-brand-600" />
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900">Facturación por patólogo</h3>
                    <p className="text-sm text-neutral-500">
                        Monto generado por cada patólogo.
                    </p>
                </div>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                {chartData.length === 0 ? (
                    <p className="text-neutral-500 text-sm">No hay datos de facturación para el período seleccionado.</p>
                ) : (
                    <div className="h-[420px] sm:h-[480px] lg:h-[520px]">
                        <BaseBarChart
                            data={chartData}
                            xKey="name"
                            series={[
                                { dataKey: 'monto', name: 'Monto generado', color: '#0d9488' },
                            ]}
                            height="100%"
                            showLegend={false}
                            xAxisFormatter={(v) => truncateName(String(v), 16)}
                            xAxisAngle={-45}
                            xAxisInterval={0}
                            yAxisFormatter={(v) => formatCurrencyShort(v)}
                            tooltipFormatter={(v) => formatCurrency(v)}
                            margin={{ bottom: 24 }}
                        />
                    </div>
                )}
            </div>
        </BaseCard>
    );
}
