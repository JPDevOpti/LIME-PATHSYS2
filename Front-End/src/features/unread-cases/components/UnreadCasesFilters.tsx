'use client';

import { BaseCard, BaseButton } from '@/shared/components/base';
import { Input, FormField, Select } from '@/shared/components/ui/form';
import { SearchButton } from '@/shared/components/ui/buttons';
import { Search, Trash2, Plus, FileSpreadsheet } from 'lucide-react';
import { EntitiesCombobox, TestsCombobox } from '@/shared/components/lists';
import type { UnreadCaseFilters } from '../types/unread-cases.types';

const STATUS_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'En proceso', label: 'En proceso' },
    { value: 'Completado', label: 'Completado' }
];

interface UnreadCasesFiltersProps {
    filters: UnreadCaseFilters;
    onFiltersChange: (updates: Partial<UnreadCaseFilters>) => void;
    onSearch: () => void;
    onClear: () => void;
    onRefresh: () => void;
    onNewCase: () => void;
    onExport: () => void;
    loading?: boolean;
    isExporting?: boolean;
}

export function UnreadCasesFilters({
    filters,
    onFiltersChange,
    onSearch,
    onClear,
    onRefresh,
    onNewCase,
    onExport,
    loading = false,
    isExporting = false
}: UnreadCasesFiltersProps) {
    return (
        <BaseCard variant="muted" padding="md" className="bg-white">
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                    <Search className="w-5 h-5 text-lime-brand-600" />
                    <h3 className="text-sm font-semibold text-neutral-700">Casos sin lectura</h3>
                    <span className="text-xs text-neutral-500">
                        Filtrar por código, documento, nombre, institución, prueba y fechas.
                    </span>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <FormField label="Buscar por código, documento o nombre" htmlFor="search-unread">
                            <Input
                                id="search-unread"
                                placeholder="Ej: UR2026-00001, 1234567890, Juan Perez"
                                value={filters.searchQuery}
                                onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                            />
                        </FormField>
                    </div>
                    <div className="flex gap-3 items-end">
                        <FormField label="Fecha desde">
                            <Input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => onFiltersChange({ dateFrom: e.target.value })}
                            />
                        </FormField>
                        <FormField label="Fecha hasta">
                            <Input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => onFiltersChange({ dateTo: e.target.value })}
                            />
                        </FormField>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FormField label="Institución">
                        <EntitiesCombobox
                            value={filters.selectedInstitution}
                            onChange={(v) => onFiltersChange({ selectedInstitution: v })}
                            onEntitySelected={(_code, name) => onFiltersChange({ selectedInstitution: name })}
                            placeholder="Todas las instituciones..."
                        />
                    </FormField>
                    <FormField label="Prueba">
                        <TestsCombobox
                            value={filters.selectedTestType}
                            onChange={(v) => onFiltersChange({ selectedTestType: v })}
                            placeholder="Todas las pruebas..."
                        />
                    </FormField>
                    <FormField label="Estado">
                        <Select
                            value={filters.selectedStatus}
                            onChange={(e) => onFiltersChange({ selectedStatus: e.target.value })}
                            options={STATUS_OPTIONS}
                        />
                    </FormField>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-2 border-t border-neutral-200">
                    <BaseButton
                        size="md"
                        variant="primary"
                        onClick={onNewCase}
                        startIcon={<Plus className="w-4 h-4" />}
                        className="border-green-600 text-green-600 hover:bg-green-50 bg-transparent"
                    >
                        Nuevo caso sin lectura
                    </BaseButton>
                    <div className="flex flex-wrap gap-2">
                        <BaseButton
                            size="md"
                            variant="secondary"
                            onClick={onExport}
                            loading={isExporting}
                            disabled={loading || isExporting}
                            startIcon={<FileSpreadsheet className="w-4 h-4" />}
                        >
                            Exportar a Excel
                        </BaseButton>
                        <BaseButton
                            size="md"
                            variant="secondary"
                            disabled={loading}
                            onClick={onClear}
                            startIcon={<Trash2 className="w-4 h-4" />}
                        >
                            Limpiar
                        </BaseButton>
                        <SearchButton
                            size="md"
                            onClick={onSearch}
                            disabled={loading}
                            text="Buscar"
                            loadingText="Buscando..."
                            loading={loading}
                        />
                    </div>
                </div>
            </div>
        </BaseCard>
    );
}
