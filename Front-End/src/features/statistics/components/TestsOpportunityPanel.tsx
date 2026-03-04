'use client';

import { useMemo } from 'react';
import type { OpportunityTest } from '../types/statistics.types';
import { clsx } from 'clsx';

interface TestsOpportunityPanelProps {
    prueba: OpportunityTest;
}

export function TestsOpportunityPanel({ prueba }: TestsOpportunityPanelProps) {
    const total = prueba.withinOpportunity + prueba.outOfOpportunity;
    const completion = total ? Math.round((prueba.withinOpportunity / total) * 100) : 0;
    const opportunityTimeDays = prueba.opportunityTimeDays ?? 6;
    const opportunityTimeLabel = `${opportunityTimeDays} días`;

    const badgeClass = useMemo(() => {
        if (completion >= 85) return 'bg-emerald-100 text-emerald-800';
        if (completion >= 70) return 'bg-amber-100 text-amber-800';
        return 'bg-red-100 text-red-800';
    }, [completion]);

    const barClass = useMemo(() => {
        if (completion >= 85) return 'bg-emerald-500';
        if (completion >= 70) return 'bg-amber-500';
        return 'bg-red-500';
    }, [completion]);

    return (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-neutral-200/50 hover:-translate-y-1 cursor-pointer">
            <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
                <div>
                    <h3 className="font-semibold text-neutral-800">{prueba.name}</h3>
                    <div className="text-xs text-neutral-500 mt-1">Código: {prueba.code}</div>
                </div>
                <div
                    className={clsx(
                        'text-xs font-medium px-2.5 py-1 rounded-full',
                        badgeClass
                    )}
                >
                    {completion}%
                </div>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <div className="text-xs text-blue-600 mb-1">Dentro de oportunidad</div>
                        <div className="text-xl font-semibold text-blue-700">{prueba.withinOpportunity}</div>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                        <div className="text-xs text-red-600 mb-1">Fuera de oportunidad</div>
                        <div className="text-xl font-semibold text-red-700">{prueba.outOfOpportunity}</div>
                    </div>
                    <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                        <div className="text-xs text-neutral-600 mb-1">Total procedimientos</div>
                        <div className="text-xl font-semibold text-neutral-700">{total}</div>
                    </div>
                </div>
                <div className="mt-2">
                    <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>Tiempo de oportunidad: {opportunityTimeLabel}</span>
                        <span>{completion}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-2.5 overflow-hidden">
                        <div
                            className={clsx('h-2.5 rounded-full transition-all', barClass)}
                            style={{ width: `${completion}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
