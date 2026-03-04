'use client';

import { useMemo } from 'react';
import type { TooltipContentProps } from 'recharts';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BaseCard } from '@/shared/components/base';
import { BarChart3 } from 'lucide-react';
import type { EntityStats } from '../../types/entities.types';

interface EntitiesPerformanceChartProps {
    datos: EntityStats[];
}

const MAX_X_AXIS_LABEL_LENGTH = 16;
const AUTO_ROTATE_LABEL_THRESHOLD = 12;

const truncateLabel = (value: string, maxLength: number = MAX_X_AXIS_LABEL_LENGTH) => {
    if (value.length <= maxLength) return value;
    if (maxLength <= 3) return value.slice(0, maxLength);
    return `${value.slice(0, maxLength - 3)}...`;
};

const COLORS: Record<string, string> = {
    ambulatorios: '#22c55e',
    hospitalizados: '#3b82f6',
    dentroOportunidad: '#6ce9a6',
    fueraOportunidad: '#f97066',
};

function CustomTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
    if (!active || !payload?.length || !label) return null;
    const suffix = (name: string) =>
        name === 'Dentro de oportunidad' || name === 'Fuera de oportunidad' ? 'casos' : 'pacientes';
    return (
        <div
            className="rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg"
            style={{ border: '1px solid #E4E7EC', boxShadow: '0px 12px 16px -4px rgba(16, 24, 40, 0.08)' }}
        >
            <p className="mb-2 text-sm font-semibold text-neutral-900">{label}</p>
            <div className="space-y-1.5">
                {payload.map((entry: { dataKey?: string; fill?: string; name?: string; value?: number }) => (
                    <div key={entry.dataKey} className="flex items-center gap-2">
                        <span
                            className="h-3 w-3 shrink-0 rounded-sm"
                            style={{ backgroundColor: entry.fill ?? COLORS[entry.dataKey as string] ?? '#94a3b8' }}
                        />
                        <span className="text-sm text-neutral-900">
                            {entry.name}: {entry.value} {suffix(entry.name ?? '')}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function EntitiesPerformanceChart({ datos }: EntitiesPerformanceChartProps) {
    const chartData = useMemo(() => {
        return datos.map((e) => ({
            name: e.nombre,
            ambulatorios: e.ambulatorios,
            hospitalizados: e.hospitalizados,
            dentroOportunidad: e.dentroOportunidad,
            fueraOportunidad: e.fueraOportunidad,
        }));
    }, [datos]);

    const maxLabelLength = useMemo(
        () => chartData.reduce((maxLength, item) => Math.max(maxLength, String(item.name ?? '').length), 0),
        [chartData],
    );

    const shouldRotateLabels = maxLabelLength > AUTO_ROTATE_LABEL_THRESHOLD;

    return (
        <BaseCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-lime-brand-600" />
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                        Distribución de pacientes por entidad
                    </h3>
                    <p className="text-sm text-neutral-500">
                        Gráfico de barras: ambulatorios + hospitalizados y dentro/fuera de oportunidad por entidad.
                    </p>
                </div>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100">
                {chartData.length === 0 ? (
                    <p className="text-neutral-500 text-sm">No hay datos de entidades para el período seleccionado.</p>
                ) : (
                    <div className="h-[320px] sm:h-[380px] lg:h-[420px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: shouldRotateLabels ? 24 : 20 }}>
                                <CartesianGrid stroke="#E4E7EC" strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#475467', fontSize: 12, textAnchor: shouldRotateLabels ? 'end' : 'middle' }}
                                    axisLine={{ stroke: '#E4E7EC' }}
                                    tickLine={false}
                                    tickFormatter={(value) => truncateLabel(String(value ?? ''))}
                                    angle={shouldRotateLabels ? -35 : 0}
                                    height={shouldRotateLabels ? 72 : 32}
                                    interval={shouldRotateLabels ? 0 : 'preserveStartEnd'}
                                />
                                <YAxis
                                    tick={{ fill: '#475467', fontSize: 12 }}
                                    axisLine={{ stroke: '#E4E7EC' }}
                                    tickLine={false}
                                    width={60}
                                    tickFormatter={(v) => `${v}`}
                                />
                                <Tooltip content={CustomTooltip} />
                                <Legend
                                    wrapperStyle={{ paddingTop: 16 }}
                                    formatter={(value) => <span style={{ color: '#000000' }}>{value}</span>}
                                />
                                <Bar
                                    dataKey="ambulatorios"
                                    name="Ambulatorios"
                                    stackId="volumen"
                                    fill="#22c55e"
                                    radius={[0, 0, 6, 6]}
                                />
                                <Bar
                                    dataKey="hospitalizados"
                                    name="Hospitalizados"
                                    stackId="volumen"
                                    fill="#3b82f6"
                                    radius={[6, 6, 0, 0]}
                                />
                                <Bar
                                    dataKey="dentroOportunidad"
                                    name="Dentro de oportunidad"
                                    stackId="oportunidad"
                                    fill="#6ce9a6"
                                    radius={[0, 0, 6, 6]}
                                />
                                <Bar
                                    dataKey="fueraOportunidad"
                                    name="Fuera de oportunidad"
                                    stackId="oportunidad"
                                    fill="#f97066"
                                    radius={[6, 6, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </BaseCard>
    );
}
