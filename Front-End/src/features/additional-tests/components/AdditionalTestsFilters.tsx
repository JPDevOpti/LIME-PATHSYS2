'use client';

import { BaseCard, BaseButton } from '@/shared/components/base';
import { Input, FormField, Select } from '@/shared/components/ui/form';
import { SearchButton } from '@/shared/components/ui/buttons';
import { EntitiesCombobox } from '@/shared/components/lists/EntitiesList';
import { PathologistsCombobox } from '@/shared/components/lists/PathologistsList';
import { TestsCombobox } from '@/shared/components/lists/TestsList';
import { Search, Trash2 } from 'lucide-react';

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'request_made', label: 'Solicitado' },
    { value: 'pending_approval', label: 'En revision' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'rejected', label: 'Rechazado' }
];

export interface ApprovalFilters {
    searchTerm: string;
    status: string;
    entity: string;
    pathologist: string;
    test: string;
    dateFrom: string;
    dateTo: string;
}

interface AdditionalTestsFiltersProps {
    filters: ApprovalFilters;
    onFiltersChange: (updates: Partial<ApprovalFilters>) => void;
    onSearch: () => void;
    onClear: () => void;
    loading?: boolean;
}

export function AdditionalTestsFilters({
    filters,
    onFiltersChange,
    onSearch,
    onClear,
    loading = false
}: AdditionalTestsFiltersProps) {
    return (
        <BaseCard variant="muted" padding="md" className="bg-white">
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                    <Search className="w-5 h-5 text-lime-brand-600" />
                    <h3 className="text-sm font-semibold text-neutral-700">
                        Pruebas adicionales
                    </h3>
                    <span className="text-xs text-neutral-500">
                        Filtrar por código, entidad, pruebas, patólogo, fechas y estado.
                    </span>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <FormField label="Buscar por código de solicitud" htmlFor="search-approval">
                            <Input
                                id="search-approval"
                                placeholder="Código de solicitud (ej. APR-2025-001)"
                                value={filters.searchTerm}
                                onChange={(e) => onFiltersChange({ searchTerm: e.target.value })}
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <FormField label="Entidad">
                        <EntitiesCombobox
                            value={filters.entity}
                            onChange={(value) => onFiltersChange({ entity: value })}
                            placeholder="Todas las entidades"
                        />
                    </FormField>
                    <FormField label="Prueba">
                        <TestsCombobox
                            value={filters.test}
                            onChange={(value) => onFiltersChange({ test: value })}
                            placeholder="Todas las pruebas"
                        />
                    </FormField>
                    <FormField label="Patólogo">
                        <PathologistsCombobox
                            value={filters.pathologist}
                            onChange={(value) => onFiltersChange({ pathologist: value })}
                            placeholder="Todos los patólogos"
                        />
                    </FormField>
                    <FormField label="Estado">
                        <Select
                            value={filters.status}
                            onChange={(e) => onFiltersChange({ status: e.target.value })}
                            options={STATUS_OPTIONS}
                        />
                    </FormField>
                </div>

                <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-2 pt-2 border-t border-neutral-200">
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
        </BaseCard>
    );
}
