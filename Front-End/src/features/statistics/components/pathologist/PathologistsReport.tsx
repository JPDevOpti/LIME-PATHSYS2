'use client';

import { useState, useEffect, useCallback } from 'react';
import { BaseCard } from '@/shared/components/base';
import { PathologistReportFilters } from './PathologistReportFilters';
import { PathologistsPerformancePanel } from '../PathologistsPerformancePanel';
import { PathologistDetailTable } from './PathologistDetailTable';
import { PathologistDetailsModal } from './PathologistDetailsModal';
import { statisticsService } from '../../services/statistics.service';
import type { PathologistPerformance } from '../../types/statistics.types';

export function PathologistsReport() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const defaultMonthIndex = (currentMonth + 11) % 12;
    const defaultYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const [selectedMonth, setSelectedMonth] = useState(String(defaultMonthIndex));
    const [selectedYear, setSelectedYear] = useState(String(defaultYear));
    const [showReport, setShowReport] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [pathologistsData, setPathologistsData] = useState<PathologistPerformance[]>([]);
    const [selectedPathologist, setSelectedPathologist] = useState<PathologistPerformance | null>(null);

    const generateReport = useCallback(async () => {
        if (!selectedMonth || !selectedYear) return;
        const monthNum = Number(selectedMonth) + 1;
        const yearNum = Number(selectedYear);
        
        // No generar informe del mes actual o futuro
        if (yearNum > currentYear) return;
        if (yearNum === currentYear && (monthNum - 1) >= currentMonth) return;

        setIsLoading(true);
        try {
            const data = await statisticsService.getPathologistsReport(monthNum, yearNum);
            setPathologistsData(data);
            setShowReport(true);
        } finally {
            setIsLoading(false);
        }
    }, [selectedMonth, selectedYear, currentYear, currentMonth]);

    useEffect(() => {
        generateReport();
    }, [generateReport]);

    // Asegurar que no se seleccione mes actual o futuro
    useEffect(() => {
        const yearNum = Number(selectedYear);
        const monthNum = Number(selectedMonth);
        if (yearNum === currentYear && monthNum >= currentMonth) {
            const previousMonth = (currentMonth + 11) % 12;
            setSelectedMonth(String(previousMonth));
            if (currentMonth === 0) {
                setSelectedYear(String(currentYear - 1));
            }
        }
    }, [selectedYear, selectedMonth, currentYear, currentMonth]);

    const clearSelection = () => {
        setSelectedMonth(String(defaultMonthIndex));
        setSelectedYear(String(defaultYear));
        setShowReport(false);
        setPathologistsData([]);
        setSelectedPathologist(null);
    };

    return (
        <div className="space-y-6">
            <PathologistReportFilters
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
                onGenerate={generateReport}
                onClear={clearSelection}
                isLoading={isLoading}
            />

            {isLoading && !showReport ? (
                <BaseCard className="p-6 flex items-center justify-center min-h-[200px]">
                    <p className="text-neutral-600">Generando informe...</p>
                </BaseCard>
            ) : !showReport ? (
                <BaseCard className="p-6">
                    <p className="text-neutral-600">
                        Aún no se ha generado el informe. Seleccione mes y año y presione "Generar informe".
                    </p>
                </BaseCard>
            ) : (
                <div className="space-y-4">
                    <PathologistsPerformancePanel datos={pathologistsData} />

                    <BaseCard className="p-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-neutral-900">Detalle por patólogo</h3>
                            <p className="text-sm text-neutral-500 mt-1">
                                Tabla con métricas detalladas. Haz clic en una fila para ver detalles.
                            </p>
                        </div>
                        {pathologistsData.length === 0 ? (
                            <p className="text-neutral-500">No hay patólogos con datos para el período seleccionado.</p>
                        ) : (
                            <PathologistDetailTable
                                datos={pathologistsData}
                                onPathologistClick={setSelectedPathologist}
                            />
                        )}
                    </BaseCard>
                </div>
            )}

            <PathologistDetailsModal
                pathologist={selectedPathologist}
                period={{
                    month: Number(selectedMonth) + 1,
                    year: Number(selectedYear),
                }}
                onClose={() => setSelectedPathologist(null)}
            />
        </div>
    );
}
