'use client';

import {
    RadialBarChart,
    RadialBar,
    PolarAngleAxis,
    ResponsiveContainer,
} from 'recharts';
import { BaseCard } from '@/shared/components/base/BaseCard';
import { DonutSpinner } from '@/shared/components/ui/loading';
import type { EstadisticasOportunidad } from '../model/dashboard.types';
import { ArrowUpRight, ArrowDownRight, Clock, CheckCircle, AlertTriangle, ClipboardList } from 'lucide-react';
import { clsx } from 'clsx';

type OportunityPercentageProps = {
    data: EstadisticasOportunidad | null;
    loading?: boolean;
};

export const OportunityPercentage = ({ data, loading }: OportunityPercentageProps) => {
    if (loading || !data) {
        return (
            <BaseCard className="h-full flex flex-col items-center justify-center gap-4 min-h-[300px]">
                <DonutSpinner size="lg" />
                <span className="text-sm text-neutral-500">Cargando métricas...</span>
            </BaseCard>
        );
    }

    const chartData = [
        {
            name: 'Oportunidad',
            value: data.porcentaje_oportunidad,
            fill: '#10b981', // emerald-500
        },
    ];

    const isPositive = data.cambio_porcentual >= 0;

    return (
        <BaseCard className="flex flex-col h-full">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                        Oportunidad de Atención
                    </h3>
                    <p className="text-sm text-neutral-500">
                        {data.mes_anterior.nombre} - Cumplimiento
                    </p>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[260px]">
                <ResponsiveContainer width="100%" height={280}>
                    <RadialBarChart
                        innerRadius="75%"
                        outerRadius="100%"
                        barSize={24}
                        data={chartData}
                        startAngle={90}
                        endAngle={-270}
                    >
                        <defs>
                            <linearGradient id="opportunityGradient" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                        </defs>
                        <PolarAngleAxis
                            type="number"
                            domain={[0, 100]}
                            angleAxisId={0}
                            tick={false}
                        />
                        <RadialBar
                            background
                            dataKey="value"
                            cornerRadius={20}
                            fill="url(#opportunityGradient)"
                        />
                    </RadialBarChart>
                </ResponsiveContainer>

                {/* Centered Percentage */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-8">
                    <span className="text-5xl font-bold text-neutral-900 tracking-tight">
                        {data.porcentaje_oportunidad}%
                    </span>
                    <div
                        className={clsx(
                            'flex items-center text-sm font-medium px-3 py-1 rounded-full mt-2',
                            isPositive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                        )}
                    >
                        {isPositive ? (
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                        ) : (
                            <ArrowDownRight className="h-4 w-4 mr-1" />
                        )}
                        {Math.abs(data.cambio_porcentual)}%
                    </div>
                </div>
            </div>

            {/* Footer Stats */}
            <div className="flex flex-col gap-6 pt-2">

                {/* Primary Stats: In vs Out and Total */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                        <span className="text-sm font-medium text-emerald-800 mb-1 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" /> Dentro
                        </span>
                        <span className="text-3xl font-bold text-emerald-700">
                            {data.casos_dentro_oportunidad}
                        </span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-rose-50/50 border border-rose-100">
                        <span className="text-sm font-medium text-rose-800 mb-1 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4" /> Fuera
                        </span>
                        <span className="text-3xl font-bold text-rose-700">
                            {data.casos_fuera_oportunidad}
                        </span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-neutral-100 border border-neutral-200 col-span-2 sm:col-span-1">
                        <span className="text-sm font-medium text-neutral-700 mb-1 flex items-center gap-1.5">
                            <ClipboardList className="w-4 h-4" /> Total de casos
                        </span>
                        <span className="text-3xl font-bold text-neutral-800">
                            {data.casos_dentro_oportunidad + data.casos_fuera_oportunidad}
                        </span>
                    </div>
                </div>

                {/* Secondary Info */}
                <div className="flex items-center justify-between px-1 text-sm text-neutral-500 border-t border-neutral-100 pt-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-lime-blue-500" />
                        <span>Promedio: <strong className="text-neutral-900">{data.tiempo_promedio} días</strong></span>
                    </div>
                    <div>
                        <span>Mes anterior: <strong className="text-neutral-900">{data.total_casos_mes_anterior}</strong> casos</span>
                    </div>
                </div>
            </div>
        </BaseCard>
    );
};
