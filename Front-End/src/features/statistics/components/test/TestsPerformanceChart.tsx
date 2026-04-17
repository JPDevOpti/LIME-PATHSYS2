'use client';

import { useMemo } from 'react';
import { BaseCard } from '@/shared/components/base';
import { BaseBarChart } from '@/shared/components/data-visualization';
import { FlaskConical } from 'lucide-react';
import type { TestStats } from '../../types/statistics.types';

interface TestsPerformanceChartProps {
    datos: TestStats[];
}

export function TestsPerformanceChart({ datos }: TestsPerformanceChartProps) {
    const chartData = useMemo(() => {
        return datos.map((t) => ({
            name: t.nombre,
            ambulatorios: t.ambulatorios,
            hospitalizados: t.hospitalizados,
            total: t.total,
        }));
    }, [datos]);

    return (
        <BaseCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="h-5 w-5 text-lime-brand-600" />
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900">Rendimiento por prueba</h3>
                    <p className="text-sm text-neutral-500">
                        Unidades de cada prueba (quantity y líneas en muestras), por tipo de atención.
                    </p>
                </div>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                {chartData.length === 0 ? (
                    <p className="text-neutral-500 text-sm">No hay datos de pruebas para el período seleccionado.</p>
                ) : (
                    <div className="h-[320px] sm:h-[380px] lg:h-[420px]">
                        <BaseBarChart
                            data={chartData}
                            xKey="name"
                            series={[
                                { dataKey: 'ambulatorios', name: 'Ambulatorios', color: '#22c55e', stackId: 'a' },
                                { dataKey: 'hospitalizados', name: 'Hospitalizados', color: '#3b82f6', stackId: 'a' },
                            ]}
                            height="100%"
                            showLegend={true}
                            tooltipFormatter={(v) => `${v} unidades`}
                        />
                    </div>
                )}
            </div>
        </BaseCard>
    );
}
