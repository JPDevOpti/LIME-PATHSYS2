'use client';

import { useMemo } from 'react';
import { BaseCard } from '@/shared/components/base';
import { BaseBarChart } from '@/shared/components/data-visualization';
import { Microscope } from 'lucide-react';
import type { PathologistPerformance } from '../types/statistics.types';

interface PathologistsPerformancePanelProps {
    datos: PathologistPerformance[];
}

export function PathologistsPerformancePanel({ datos }: PathologistsPerformancePanelProps) {
    const chartData = useMemo(() => {
        return datos.map((p) => ({
            name: p.name || 'Desconocido',
            within: p.withinOpportunity,
            out: p.outOfOpportunity,
            total: p.withinOpportunity + p.outOfOpportunity,
        }));
    }, [datos]);

    return (
        <BaseCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <Microscope className="h-5 w-5 text-lime-brand-600" />
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900">Rendimiento por patólogo</h3>
                    <p className="text-sm text-neutral-500">Comparación entre todos los patólogos.</p>
                </div>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                <h4 className="text-md font-medium text-neutral-800 mb-4">Comparación por patólogo</h4>
                {chartData.length === 0 ? (
                    <p className="text-neutral-500 text-sm">No hay datos de patólogos para el período seleccionado.</p>
                ) : (
                    <div className="h-[320px] sm:h-[380px] lg:h-[420px]">
                        <BaseBarChart
                            data={chartData}
                            xKey="name"
                            series={[
                                { dataKey: 'within', name: 'Dentro de oportunidad', color: '#6ce9a6', stackId: 'a' },
                                { dataKey: 'out', name: 'Fuera de oportunidad', color: '#f97066', stackId: 'a' },
                            ]}
                            height="100%"
                            showLegend={true}
                            tooltipFormatter={(v) => `${v} procedimientos`}
                        />
                    </div>
                )}
            </div>
        </BaseCard>
    );
}
