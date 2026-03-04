'use client';

import { BaseCard, BaseButton } from '@/shared/components/base';
import { Input, FormField, Select } from '@/shared/components/ui/form';
import { SearchButton, ClearButton } from '@/shared/components/ui/buttons';
import { Search, Plus } from 'lucide-react';
import type { EntitiesFilters as EntitiesFiltersType } from '../types/entities-filters.types';

const STATUS_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
];

interface EntitiesFiltersProps {
    filters: EntitiesFiltersType;
    onFiltersChange: (updates: Partial<EntitiesFiltersType>) => void;
    onSearch: () => void;
    onClear: () => void;
    onNewEntity: () => void;
    loading?: boolean;
}

export function EntitiesFilters({
    filters,
    onFiltersChange,
    onSearch,
    onClear,
    onNewEntity,
    loading = false,
}: EntitiesFiltersProps) {
    return (
        <BaseCard className="p-6">
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                    <Search className="w-5 h-5 text-lime-brand-600" />
                    <span className="text-sm font-semibold text-neutral-700">Gestion de entidades</span>
                    <span className="text-xs text-neutral-500">
                        Buscar por nombre o codigo. Filtrar por estado.
                    </span>
                </div>

                <div className="flex flex-col gap-3">
                    <FormField label="Buscar por nombre o codigo" htmlFor="search-entities">
                        <Input
                            id="search-entities"
                            placeholder="Ej: Hospital Alma Mater, HAMA-001"
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
                        </div>
                        <div className="flex gap-2 items-center">
                            <BaseButton
                                size="md"
                                variant="secondary"
                                onClick={onNewEntity}
                                startIcon={<Plus className="w-4 h-4" />}
                                className="border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                            >
                                Nueva entidad
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
