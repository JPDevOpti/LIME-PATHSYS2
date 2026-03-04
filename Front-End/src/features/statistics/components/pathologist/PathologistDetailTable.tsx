'use client';

import { ChevronRightIcon } from '@heroicons/react/24/outline';
import type { PathologistPerformance } from '../../types/statistics.types';

interface PathologistDetailTableProps {
    datos: PathologistPerformance[];
    onPathologistClick?: (p: PathologistPerformance) => void;
}

function compliancePercentage(p: PathologistPerformance): number {
    const total = p.withinOpportunity + p.outOfOpportunity;
    return total > 0 ? Math.round((p.withinOpportunity / total) * 100) : 0;
}

function getComplianceClass(percentage: number): string {
    if (percentage >= 80) return 'text-green-600 font-semibold';
    if (percentage >= 60) return 'text-amber-600 font-semibold';
    return 'text-red-600 font-semibold';
}

export function PathologistDetailTable({ datos, onPathologistClick }: PathologistDetailTableProps) {
    const sorted = [...datos].sort((a, b) => {
        const aTotal = a.withinOpportunity + a.outOfOpportunity;
        const bTotal = b.withinOpportunity + b.outOfOpportunity;
        return bTotal - aTotal;
    });

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                    <tr>
                        <th scope="col" className="w-[50%] px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Patólogo
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Total
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Dentro
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Fuera
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            % Cumplimiento
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Tiempo Promedio
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                    {sorted.map((p) => {
                        const total = p.withinOpportunity + p.outOfOpportunity;
                        const pct = compliancePercentage(p);
                        return (
                            <tr
                                key={p.code}
                                className="hover:bg-neutral-50 cursor-pointer transition-colors"
                                onClick={() => onPathologistClick?.(p)}
                            >
                                <td className="w-[50%] px-6 py-4 whitespace-nowrap text-left text-sm font-medium text-neutral-900">
                                    <div className="flex items-center gap-2">
                                        <span>{p.name}</span>
                                        <ChevronRightIcon className="w-4 h-4 text-neutral-400" />
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-neutral-900">{total}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600 font-medium">
                                    {p.withinOpportunity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-red-600 font-medium">
                                    {p.outOfOpportunity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                    <span className={getComplianceClass(pct)}>{pct}%</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-neutral-900">
                                    {p.avgTime?.toFixed(1) ?? '0.0'} días
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
