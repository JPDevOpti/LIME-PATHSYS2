'use client';

import { BaseCard, BaseButton } from '@/shared/components/base';
import { Select } from '@/shared/components/ui/form';
import { FormField } from '@/shared/components/ui/form';
import { ClearButton } from '@/shared/components/ui/buttons';
import { Building2 } from 'lucide-react';

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

interface EntityReportFiltersProps {
    selectedMonth: string;
    selectedYear: string;
    onMonthChange: (v: string) => void;
    onYearChange: (v: string) => void;
    onGenerate: () => void;
    onClear: () => void;
    isLoading?: boolean;
}

export function EntityReportFilters({
    selectedMonth,
    selectedYear,
    onMonthChange,
    onYearChange,
    onGenerate,
    onClear,
    isLoading = false,
}: EntityReportFiltersProps) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    const monthOptions = MONTHS.map((m, idx) => {
        if (Number(selectedYear) === currentYear && idx >= currentMonth) return null;
        return { value: String(idx), label: m };
    }).filter((o): o is NonNullable<typeof o> => o !== null);
    const yearOptions = years.map((y) => ({ value: String(y), label: String(y) }));
    const canGenerate = Boolean(selectedMonth && selectedYear);

    return (
        <BaseCard className="p-6">
            <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-5 w-5 text-lime-brand-600" />
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-900">
                            Reporte de entidades
                        </h3>
                        <p className="text-sm text-neutral-500">
                            Seleccione mes y año para generar el informe.
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap items-end gap-4 mt-4">
                <FormField label="Mes" className="w-48">
                    <Select
                        value={selectedMonth}
                        onChange={(e) => onMonthChange(e.target.value)}
                        options={monthOptions}
                        placeholder="Seleccionar mes"
                    />
                </FormField>
                <FormField label="Año" className="w-48">
                    <Select
                        value={selectedYear}
                        onChange={(e) => onYearChange(e.target.value)}
                        options={yearOptions}
                        placeholder="Seleccionar año"
                    />
                </FormField>
                <div className="flex items-center gap-2">
                    <BaseButton
                        variant="primary"
                        size="md"
                        onClick={onGenerate}
                        disabled={!canGenerate || isLoading}
                    >
                        {isLoading ? 'Generando...' : 'Generar informe'}
                    </BaseButton>
                    <ClearButton text="Limpiar" onClick={onClear} className="[&>svg]:mr-2" />
                </div>
            </div>
        </BaseCard>
    );
}
