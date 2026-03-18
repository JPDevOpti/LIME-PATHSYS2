'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BaseCard } from '@/shared/components/base';
import { FlaskConical } from 'lucide-react';
import { OpportunityReportFilters } from './OpportunityReportFilters';
import { OpportunityStatsCard } from './OpportunityStatsCard';
import { PathologistsPerformancePanel } from './PathologistsPerformancePanel';
import { TestsOpportunityPanel } from './TestsOpportunityPanel';
import { BaseLineChart } from '@/shared/components/data-visualization';
import { statisticsService } from '../services/statistics.service';
import type { OpportunityReportData, EstadisticasOportunidad } from '../types/statistics.types';

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function OpportunityReport() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Por defecto, cargar el mes inmediatamente anterior
    const defaultMonthIndex = (currentMonth + 11) % 12;
    const defaultYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const [selectedMonth, setSelectedMonth] = useState(String(defaultMonthIndex));
    const [selectedYear, setSelectedYear] = useState(String(defaultYear));
    const [selectedEntity, setSelectedEntity] = useState('');
    const [showReport, setShowReport] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState<OpportunityReportData | null>(null);

    const monthLabel = MONTHS[Number(selectedMonth)] ?? '';

    // Construye el objeto EstadisticasOportunidad desde el summary del reporte
    // para alimentar OpportunityStatsCard con la misma interfaz que el dashboard
    const opportunityStats = useMemo((): EstadisticasOportunidad | null => {
        if (!reportData?.summary) return null;
        const s = reportData.summary;
        const pct = s.total > 0 ? Math.round((s.within / s.total) * 100 * 10) / 10 : 0;
        return {
            porcentaje_oportunidad: pct,
            cambio_porcentual: s.percentage_change ?? 0,
            tiempo_promedio: s.averageDays ?? 0,
            casos_dentro_oportunidad: s.within,
            casos_fuera_oportunidad: s.out,
            total_casos_mes_anterior: s.total_last_month ?? 0,
            mes_anterior: { nombre: monthLabel, inicio: '', fin: '' },
        };
    }, [reportData, monthLabel]);

    // Datos de tendencia mensual para el gráfico de línea
    const lineData = useMemo(() => {
        const yearNum = Number(selectedYear) || new Date().getFullYear();
        return (reportData?.monthlyPct ?? []).map((v, i) => ({
            name: MONTHS[i]?.slice(0, 3) ?? '',
            value: Number(Number(v).toFixed(1)),
        }));
    }, [reportData, selectedYear]);

    // Datos de flujo mensual (casos y pacientes)
    const flowData = useMemo(() => {
        const cases = reportData?.monthlyCases ?? [];
        const patients = reportData?.monthlyPatients ?? [];
        return MONTHS.map((m, i) => ({
            name: m.slice(0, 3),
            casos: cases[i] ?? 0,
            pacientes: patients[i] ?? 0,
        }));
    }, [reportData, selectedYear]);

    const generateReport = useCallback(async () => {
        if (!selectedMonth || !selectedYear) return;
        const monthNum = Number(selectedMonth) + 1;
        const yearNum = Number(selectedYear);
        
        // No generar informe del mes actual o futuro
        if (yearNum > currentYear) return;
        if (yearNum === currentYear && (monthNum - 1) >= currentMonth) return;

        setIsLoading(true);
        try {
            const data = await statisticsService.getOpportunityReport(monthNum, yearNum, selectedEntity || undefined);
            setReportData(data);
            setShowReport(true);
        } finally {
            setIsLoading(false);
        }
    }, [selectedMonth, selectedYear, selectedEntity, currentYear, currentMonth]);

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
        setSelectedEntity('');
        setShowReport(false);
        setReportData(null);
    };

    return (
        <div className="space-y-6">
            <OpportunityReportFilters
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
                    <p className="text-neutral-600">Generando reporte...</p>
                </BaseCard>
            ) : !showReport ? (
                <BaseCard className="p-6">
                    <p className="text-neutral-600">
                        Aún no se ha generado el reporte. Seleccione mes, año y entidad, luego presione "Generar reporte".
                    </p>
                </BaseCard>
            ) : (
                <div className="space-y-4">
                    {reportData && (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                                {/* Card de oportunidad */}
                                <div className="lg:col-span-2">
                                    <OpportunityStatsCard
                                        data={opportunityStats}
                                        loading={isLoading}
                                        selectedMonth={Number(selectedMonth)}
                                        selectedYear={Number(selectedYear)}
                                        selectedEntity={selectedEntity}
                                    />
                                </div>

                                {/* Gráficos de línea — columna derecha */}
                                <div className="lg:col-span-3 space-y-4">
                                    <BaseCard className="p-4">
                                        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                                            Tendencia de cumplimiento
                                        </h3>
                                        <BaseLineChart
                                            data={lineData}
                                            xKey="name"
                                            series={[{
                                                dataKey: 'value',
                                                name: 'Cumplimiento',
                                                color: '#0ba5ec',
                                                strokeWidth: 3,
                                                dot: false,
                                            }]}
                                            height={200}
                                            showLegend={false}
                                            yAxisFormatter={(v) => `${v}%`}
                                            tooltipFormatter={(v) => `${v}%`}
                                        />
                                    </BaseCard>
                                    <BaseCard className="p-4">
                                        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                                            Flujo mensual
                                        </h3>
                                        <BaseLineChart
                                            data={flowData}
                                            xKey="name"
                                            series={[
                                                {
                                                    dataKey: 'casos',
                                                    name: 'Casos',
                                                    color: '#0ba5ec',
                                                    strokeWidth: 2,
                                                    dot: false,
                                                },
                                                {
                                                    dataKey: 'pacientes',
                                                    name: 'Pacientes',
                                                    color: '#22c55e',
                                                    strokeWidth: 2,
                                                    dot: false,
                                                },
                                            ]}
                                            height={240}
                                            showLegend
                                        />
                                    </BaseCard>
                                </div>
                            </div>

                            <PathologistsPerformancePanel datos={reportData.pathologists} />

                            <BaseCard className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <FlaskConical className="h-5 w-5 text-lime-brand-600" />
                                    <div>
                                        <h3 className="text-lg font-semibold text-neutral-900">
                                            Detalle por procedimiento
                                        </h3>
                                        <p className="text-sm text-neutral-500">
                                            Paneles de oportunidad por tipo de prueba.
                                        </p>
                                    </div>
                                </div>
                                {reportData.tests.length === 0 ? (
                                    <p className="text-neutral-500">No hay procedimientos para el período seleccionado.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                        {reportData.tests.map((t) => (
                                            <TestsOpportunityPanel key={t.code} prueba={t} />
                                        ))}
                                    </div>
                                )}
                            </BaseCard>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
