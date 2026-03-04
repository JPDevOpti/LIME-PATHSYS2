'use client';

import { BaseCard, BaseButton } from '@/shared/components/base';
import { Input, FormField, Select } from '@/shared/components/ui/form';
import { SearchButton, ClearButton } from '@/shared/components/ui/buttons';
import { Search, FlaskConical } from 'lucide-react';
import type { TestsFilters as TestsFiltersType } from '../types/tests-filters.types';

const STATUS_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
];

const PRICE_RANGE_OPTIONS = [
    { value: '', label: 'Todos los precios' },
    { value: '0-50000', label: 'Hasta 50.000' },
    { value: '50000-100000', label: '50.000 - 100.000' },
    { value: '100000-150000', label: '100.000 - 150.000' },
    { value: '150000-200000', label: '150.000 - 200.000' },
    { value: '200000-300000', label: '200.000 - 300.000' },
    { value: '300000-999999999', label: 'Mas de 300.000' },
];

const DAYS_RANGE_OPTIONS = [
    { value: '', label: 'Todos los dias' },
    { value: '1-3', label: '1 - 3 dias' },
    { value: '4-7', label: '4 - 7 dias' },
    { value: '8-14', label: '8 - 14 dias' },
    { value: '15-21', label: '15 - 21 dias' },
    { value: '22-30', label: '22 - 30 dias' },
    { value: '31-365', label: 'Mas de 30 dias' },
];

interface TestsFiltersProps {
    filters: TestsFiltersType;
    onFiltersChange: (updates: Partial<TestsFiltersType>) => void;
    onSearch: () => void;
    onClear: () => void;
    onNewTest: () => void;
    loading?: boolean;
}

export function TestsFilters({
    filters,
    onFiltersChange,
    onSearch,
    onClear,
    onNewTest,
    loading = false,
}: TestsFiltersProps) {
    return (
        <BaseCard className="p-6">
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                    <Search className="w-5 h-5 text-lime-brand-600" />
                    <span className="text-sm font-semibold text-neutral-700">Gestion de pruebas</span>
                    <span className="text-xs text-neutral-500">
                        Buscar por nombre o codigo. Filtrar por estado, rango de precio y dias.
                    </span>
                </div>

                <div className="flex flex-col gap-3">
                    <FormField label="Buscar por nombre o codigo" htmlFor="search-tests">
                        <Input
                            id="search-tests"
                            placeholder="Ej: Biopsia, BIO-01"
                            value={filters.searchQuery}
                            onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                        />
                    </FormField>

                    <div className="flex flex-wrap items-end gap-4 justify-between">
                        <div className="flex flex-wrap items-end gap-4">
                            <FormField label="Estado" className="w-52">
                                <Select
                                    value={filters.status}
                                    onChange={(e) => onFiltersChange({ status: e.target.value })}
                                    options={STATUS_OPTIONS}
                                    placeholder="Todos"
                                />
                            </FormField>
                            <FormField label="Rango de precio" className="w-52">
                                <Select
                                    value={filters.priceRange}
                                    onChange={(e) => onFiltersChange({ priceRange: e.target.value })}
                                    options={PRICE_RANGE_OPTIONS}
                                    placeholder="Todos los precios"
                                />
                            </FormField>
                            <FormField label="Rango de dias" className="w-44">
                                <Select
                                    value={filters.daysRange}
                                    onChange={(e) => onFiltersChange({ daysRange: e.target.value })}
                                    options={DAYS_RANGE_OPTIONS}
                                    placeholder="Todos los dias"
                                />
                            </FormField>
                        </div>
                        <div className="flex gap-2 items-center">
                            <BaseButton
                                size="md"
                                variant="secondary"
                                onClick={onNewTest}
                                startIcon={<FlaskConical className="w-4 h-4" />}
                                className="border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                            >
                                Nueva prueba
                            </BaseButton>
                            <ClearButton text="Limpiar" onClick={onClear} className="[&>svg]:mr-2" />
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
            </div>
        </BaseCard>
    );
}
