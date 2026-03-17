'use client';

import { useState, useEffect } from 'react';
import { BaseCard, BaseButton } from '@/shared/components/base';
import { Input, Select, FormField } from '@/shared/components/ui/form';
import { SearchButton } from '@/shared/components/ui/buttons';
import { Search, Trash2, FileSpreadsheet } from 'lucide-react';
import type { PatientListFilters } from '../hooks/usePatientList';
import { EntitiesCombobox } from '@/shared/components/lists';

interface PatientsFiltersBarProps {
    filters: PatientListFilters;
    onFiltersChange: (updates: Partial<PatientListFilters>) => void;
    isLoading?: boolean;
    canExport?: boolean;
    onExport: () => void;
    onSearch: (filters: PatientListFilters) => void;
    onClear: () => void;
}

const CARE_TYPE_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'Ambulatorio', label: 'Ambulatorio' },
    { value: 'Hospitalizado', label: 'Hospitalizado' }
];

const GENDER_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'Masculino', label: 'Masculino' },
    { value: 'Femenino', label: 'Femenino' }
];

export function PatientsFiltersBar({
    filters,
    onFiltersChange,
    isLoading = false,
    canExport = false,
    onExport,
    onSearch,
    onClear
}: PatientsFiltersBarProps) {
    const [localFilters, setLocalFilters] = useState<PatientListFilters>(filters);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handleLocalChange = (updates: Partial<PatientListFilters>) => {
        setLocalFilters(prev => ({ ...prev, ...updates }));
    };

    const handleSearchClick = () => {
        onFiltersChange(localFilters);
        onSearch(localFilters);
    };
    return (
        <BaseCard variant="muted" padding="md" className="bg-white">
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                    <Search className="w-5 h-5 text-lime-brand-600" />
                    <h3 className="text-sm font-semibold text-neutral-700">
                        Listado de Pacientes
                    </h3>
                    <span className="text-xs text-neutral-500">
                        Filtrar por nombre, código, documento, fechas, entidad, tipo de atención y sexo.
                    </span>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <FormField label="Buscar por nombre, código o documento">
                            <Input
                                type="text"
                                value={localFilters.search}
                                onChange={e => handleLocalChange({ search: e.target.value })}
                                onKeyPress={e => e.key === 'Enter' && handleSearchClick()}
                                placeholder="Ej: P-001, 12345678, Juan Pérez"
                            />
                        </FormField>
                    </div>
                    <div className="flex gap-3 items-end">
                        <FormField label="Fecha desde">
                            <Input
                                type="date"
                                value={localFilters.dateFrom}
                                onChange={e => handleLocalChange({ dateFrom: e.target.value })}
                            />
                        </FormField>
                        <FormField label="Fecha hasta">
                            <Input
                                type="date"
                                value={localFilters.dateTo}
                                onChange={e => handleLocalChange({ dateTo: e.target.value })}
                            />
                        </FormField>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 w-full">
                    <div className="md:col-span-2">
                        <FormField label="Entidad">
                            <EntitiesCombobox
                                value={localFilters.entity}
                                onChange={() => {}}
                                onEntitySelected={(_code, name) => handleLocalChange({ entity: name })}
                                placeholder="Buscar entidad..."
                            />
                        </FormField>
                    </div>
                    <div className="md:col-span-1">
                        <FormField label="Tipo de atención">
                            <Select
                                value={localFilters.care_type}
                                onChange={e =>
                                    handleLocalChange({
                                        care_type: e.target.value as '' | 'Ambulatorio' | 'Hospitalizado'
                                    })
                                }
                                options={CARE_TYPE_OPTIONS}
                            />
                        </FormField>
                    </div>
                    <div className="md:col-span-1">
                        <FormField label="Sexo">
                            <Select
                                value={localFilters.gender}
                                onChange={e =>
                                    handleLocalChange({
                                        gender: e.target.value as '' | 'Masculino' | 'Femenino'
                                    })
                                }
                                options={GENDER_OPTIONS}
                            />
                        </FormField>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-2 pt-2 border-t border-neutral-200">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <BaseButton
                            size="md"
                            variant="secondary"
                            disabled={!canExport}
                            onClick={onExport}
                            startIcon={<FileSpreadsheet className="w-4 h-4" />}
                        >
                            Exportar a Excel
                        </BaseButton>
                        <BaseButton
                            size="md"
                            variant="secondary"
                            onClick={onClear}
                            startIcon={<Trash2 className="w-4 h-4" />}
                        >
                            Limpiar
                        </BaseButton>
                        <SearchButton
                            size="md"
                            onClick={handleSearchClick}
                            disabled={isLoading}
                            text="Buscar"
                            loadingText="Buscando..."
                            loading={isLoading}
                        />
                    </div>
                </div>
            </div>
        </BaseCard>
    );
}
