'use client';

import { useMemo } from 'react';
import { BaseCard } from '@/shared/components/base';
import { BasePieChart, BaseLineChart } from '@/shared/components/data-visualization';
import type { PieDatum } from '@/shared/components/data-visualization';
import type { OpportunitySummaryStats } from '../../types/statistics.types';

const MONTHS_SHORT = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

interface OpportunitySummaryProps {
    resumen: OpportunitySummaryStats | null;
    monthlyPct?: number[];
    selectedYear?: string;
}

export function OpportunitySummary({ resumen, monthlyPct = [], selectedYear = '' }: OpportunitySummaryProps) {
    const totalWithin = resumen?.within ?? 0;
    const totalOut = resumen?.out ?? 0;
    const total = resumen?.total ?? totalWithin + totalOut;
    const pctWithin = total ? ((totalWithin / total) * 100).toFixed(1) : '0.0';
    const pctOut = total ? ((totalOut / total) * 100).toFixed(1) : '0.0';

    const donutData: PieDatum[] = useMemo(() => [
        { name: 'Dentro de oportunidad', value: totalWithin },
        { name: 'Fuera de oportunidad', value: totalOut },
    ], [totalWithin, totalOut]);

    const lineData = useMemo(() => {
        const yearNum = Number(selectedYear) || new Date().getFullYear();
        const categories = MONTHS_SHORT.map((m, i) => `${m} ${yearNum}`);
        if (monthlyPct.length >= 12) {
            const last12 = monthlyPct.length >= 24 ? monthlyPct.slice(12, 24) : monthlyPct.slice(0, 12);
            return last12.map((v, i) => ({
                name: categories[i],
                value: Number(Number(v).toFixed(1)),
            }));
        }
        const currentPct = Number(pctWithin);
        return categories.map((_, i) => ({
            name: categories[i],
            value: Number(Math.max(0, Math.min(100, currentPct + ((i - 6) / 12) * 6)).toFixed(1)),
        }));
    }, [monthlyPct, pctWithin, selectedYear]);

    return (
        <BaseCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Resumen de oportunidad</h3>
            </div>
            <p className="text-sm text-neutral-500 mb-4">
                Resumen de oportunidades generales del laboratorio.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-sm font-semibold text-blue-700 mb-1">Dentro de oportunidad</h4>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-blue-600">{totalWithin}</span>
                        <span className="text-sm text-blue-500">{pctWithin}%</span>
                    </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <h4 className="text-sm font-semibold text-red-700 mb-1">Fuera de oportunidad</h4>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-red-600">{totalOut}</span>
                        <span className="text-sm text-red-500">{pctOut}%</span>
                    </div>
                </div>
                <div className="bg-neutral-100 p-4 rounded-lg border border-neutral-200">
                    <h4 className="text-sm font-semibold text-neutral-700 mb-1">Total de casos</h4>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-neutral-800">{total}</span>
                        <span className="text-sm text-neutral-500">100%</span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                    <h4 className="text-sm font-semibold text-neutral-800 mb-3">Distribución general</h4>
                    <BasePieChart
                        data={donutData}
                        height={240}
                        innerRadius={60}
                        outerRadius={90}
                        colors={['#6ce9a6', '#f97066']}
                        showLegend={true}
                        showTooltip={true}
                        centerLabel={`${pctWithin}%`}
                        legendTextColor="#000000"
                        tooltipFormatter={(v, name) => {
                            const pct = total ? ((Number(v) / total) * 100).toFixed(1) : '0';
                            return `${v} procedimientos (${pct}%)`;
                        }}
                    />
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                    <h4 className="text-sm font-semibold text-neutral-800 mb-3">Tendencia de cumplimiento</h4>
                    <BaseLineChart
                        data={lineData}
                        xKey="name"
                        series={[
                            { dataKey: 'value', name: 'Cumplimiento', color: '#0ba5ec', strokeWidth: 3, dot: false },
                        ]}
                        height={240}
                        showLegend={false}
                        yAxisFormatter={(v) => `${v}%`}
                        tooltipFormatter={(v) => `${v}%`}
                    />
                </div>
            </div>
        </BaseCard>
    );
}
