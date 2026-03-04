'use client';

import { useState, useEffect, useCallback } from 'react';
import { BaseCard } from '@/shared/components/base';
import { TestReportFilters } from './TestReportFilters';
import { TestsSummary } from './TestsSummary';
import { TestsPerformanceChart } from './TestsPerformanceChart';
import { TestsDetailTable } from './TestsDetailTable';
import { statisticsService } from '../../services/statistics.service';
import type { TestStats } from '../../types/statistics.types';

export function TestsReport() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const defaultMonthIndex = (currentMonth + 11) % 12;
    const defaultYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const [selectedMonth, setSelectedMonth] = useState(String(defaultMonthIndex));
    const [selectedYear, setSelectedYear] = useState(String(defaultYear));
    const [selectedEntity, setSelectedEntity] = useState('');
    const [showReport, setShowReport] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [testsData, setTestsData] = useState<TestStats[]>([]);
    const [summary, setSummary] = useState<{ total: number; ambulatorios: number; hospitalizados: number } | null>(null);

    const generateReport = useCallback(async () => {
        if (!selectedMonth || !selectedYear) return;
        const monthNum = Number(selectedMonth) + 1;
        const yearNum = Number(selectedYear);
        
        // No generar informe del mes actual o futuro
        if (yearNum > currentYear) return;
        if (yearNum === currentYear && (monthNum - 1) >= currentMonth) return;

        setIsLoading(true);
        try {
            const data = await statisticsService.getTestsReport(monthNum, yearNum, selectedEntity || undefined);
            setTestsData(data.tests);
            setSummary(data.summary ?? null);
            setShowReport(true);
        } finally {
            setIsLoading(false);
        }
    }, [selectedMonth, selectedYear, selectedEntity, currentYear, currentMonth]);

    useEffect(() => {
        generateReport();
    }, [generateReport]);

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
        setSelectedEntity('');
        setShowReport(false);
        setTestsData([]);
        setSummary(null);
    };

    return (
        <div className="space-y-6">
            <TestReportFilters
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                selectedEntity={selectedEntity}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
                onEntityChange={setSelectedEntity}
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
                        Aún no se ha generado el informe. Seleccione mes, año y entidad y presione "Generar informe".
                    </p>
                </BaseCard>
            ) : (
                <div className="space-y-4">
                    <TestsSummary datos={testsData} resumen={summary ?? undefined} />

                    <TestsPerformanceChart datos={testsData} />

                    <BaseCard className="p-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-neutral-900">Detalle por prueba</h3>
                            <p className="text-sm text-neutral-500 mt-1">
                                Tabla con ambulatorios y hospitalizados por tipo de prueba.
                            </p>
                        </div>
                        {testsData.length === 0 ? (
                            <p className="text-neutral-500">No hay pruebas con datos para el período seleccionado.</p>
                        ) : (
                            <TestsDetailTable datos={testsData} />
                        )}
                    </BaseCard>
                </div>
            )}
        </div>
    );
}
