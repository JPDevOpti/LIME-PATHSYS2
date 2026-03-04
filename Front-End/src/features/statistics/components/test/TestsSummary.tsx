'use client';

import { useMemo } from 'react';
import { BaseCard } from '@/shared/components/base';
import type { TestStats } from '../../types/statistics.types';

interface TestsSummaryProps {
    datos: TestStats[];
    resumen?: {
        total: number;
        ambulatorios: number;
        hospitalizados: number;
    };
}

export function TestsSummary({ datos, resumen }: TestsSummaryProps) {
    const totalAmbulatorios = useMemo(() => {
        if (resumen?.ambulatorios !== undefined) return resumen.ambulatorios;
        return datos.reduce((s, t) => s + t.ambulatorios, 0);
    }, [datos, resumen?.ambulatorios]);

    const totalHospitalizados = useMemo(() => {
        if (resumen?.hospitalizados !== undefined) return resumen.hospitalizados;
        return datos.reduce((s, t) => s + t.hospitalizados, 0);
    }, [datos, resumen?.hospitalizados]);

    const total = useMemo(() => {
        if (resumen?.total !== undefined) return resumen.total;
        return totalAmbulatorios + totalHospitalizados;
    }, [resumen?.total, totalAmbulatorios, totalHospitalizados]);

    const totalPacientes = total;
    const porcentajeAmbulatorios = totalPacientes > 0 ? Math.round((totalAmbulatorios / totalPacientes) * 100) : 0;
    const porcentajeHospitalizados = totalPacientes > 0 ? Math.round((totalHospitalizados / totalPacientes) * 100) : 0;

    return (
        <BaseCard className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Resumen de pruebas</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <h4 className="text-sm font-semibold text-green-700 mb-1">Ambulatorios</h4>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-green-600">{totalAmbulatorios}</span>
                        <span className="text-sm text-green-500">{porcentajeAmbulatorios}%</span>
                    </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-sm font-semibold text-blue-700 mb-1">Hospitalizados</h4>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-blue-600">{totalHospitalizados}</span>
                        <span className="text-sm text-blue-500">{porcentajeHospitalizados}%</span>
                    </div>
                </div>
                <div className="bg-neutral-100 p-4 rounded-lg border border-neutral-200">
                    <h4 className="text-sm font-semibold text-neutral-700 mb-1">Total casos</h4>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-neutral-800">{total}</span>
                        <span className="text-sm text-neutral-500">100%</span>
                    </div>
                </div>
            </div>
        </BaseCard>
    );
}
