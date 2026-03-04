'use client';

import { useState, useEffect, useCallback } from 'react';
import { BaseCard } from '@/shared/components/base';
import { EntityReportFilters } from './EntityReportFilters';
import { EntitiesSummary } from './EntitiesSummary';
import { EntitiesPerformanceChart } from './EntitiesPerformanceChart';
import { EntitiesDetailTable } from './EntitiesDetailTable';
import { EntityDetailsModal } from './EntityDetailsModal';
import { statisticsService } from '../../services/statistics.service';
import { isHamaEntity } from '../../hooks/useAvailableFilters';
import type { EntityStats } from '../../types/entities.types';

export function EntitiesReport() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const defaultMonthIndex = (currentMonth + 11) % 12;
    const defaultYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const [selectedMonth, setSelectedMonth] = useState(String(defaultMonthIndex));
    const [selectedYear, setSelectedYear] = useState(String(defaultYear));
    const [showReport, setShowReport] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [entitiesData, setEntitiesData] = useState<EntityStats[]>([]);
    const [summary, setSummary] = useState<{ total: number; ambulatorios: number; hospitalizados: number; tiempoPromedio: number } | null>(null);
    const [selectedEntity, setSelectedEntity] = useState<EntityStats | null>(null);

    const generateReport = useCallback(async () => {
        if (!selectedMonth || !selectedYear) return;
        const monthNum = Number(selectedMonth) + 1;
        const yearNum = Number(selectedYear);
        
        // No generar informe del mes actual o futuro
        if (yearNum > currentYear) return;
        if (yearNum === currentYear && (monthNum - 1) >= currentMonth) return;

        setIsLoading(true);
        try {
            const data = await statisticsService.getEntitiesReport(monthNum, yearNum);
            const filteredEntities = data.entities.filter(
                (entity) => !isHamaEntity(entity.nombre) && !isHamaEntity(entity.codigo),
            );
            const computedSummary = {
                total: filteredEntities.reduce((sum, entity) => sum + entity.total, 0),
                ambulatorios: filteredEntities.reduce((sum, entity) => sum + entity.ambulatorios, 0),
                hospitalizados: filteredEntities.reduce((sum, entity) => sum + entity.hospitalizados, 0),
                tiempoPromedio:
                    filteredEntities.length > 0
                        ? Number(
                              (
                                  filteredEntities.reduce((sum, entity) => sum + entity.tiempoPromedio, 0) /
                                  filteredEntities.length
                              ).toFixed(2),
                          )
                        : 0,
            };

            setEntitiesData(filteredEntities);
            setSummary(computedSummary);
            setShowReport(true);
        } finally {
            setIsLoading(false);
        }
    }, [selectedMonth, selectedYear, currentYear, currentMonth]);

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
        setShowReport(false);
        setEntitiesData([]);
        setSummary(null);
        setSelectedEntity(null);
    };

    return (
        <div className="space-y-6">
            <EntityReportFilters
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
                    <EntitiesSummary datos={entitiesData} resumen={summary ?? undefined} />

                    <EntitiesPerformanceChart datos={entitiesData} />

                    <BaseCard className="p-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-neutral-900">Detalle por entidad</h3>
                            <p className="text-sm text-neutral-500 mt-1">
                                Tabla con métricas detalladas. Haz clic en una fila para ver detalles.
                            </p>
                        </div>
                        {entitiesData.length === 0 ? (
                            <p className="text-neutral-500">No hay entidades con datos para el período seleccionado.</p>
                        ) : (
                            <EntitiesDetailTable
                                datos={entitiesData}
                                onEntityClick={setSelectedEntity}
                            />
                        )}
                    </BaseCard>
                </div>
            )}

            <EntityDetailsModal
                entity={selectedEntity}
                period={{
                    month: Number(selectedMonth) + 1,
                    year: Number(selectedYear),
                }}
                onClose={() => setSelectedEntity(null)}
            />
        </div>
    );
}
