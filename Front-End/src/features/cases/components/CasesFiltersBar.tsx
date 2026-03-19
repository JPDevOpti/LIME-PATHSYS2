'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { BaseCard, BaseButton } from '@/shared/components/base';
import { Input, Select, FormField } from '@/shared/components/ui/form';
import { SearchButton } from '@/shared/components/ui/buttons';
import { Search, FileSpreadsheet, Plus, Trash2, Lock, Printer, PackageCheck } from 'lucide-react';
import type { CaseListFilters } from '../hooks/useCaseList';
import type { Case } from '../types/case.types';
import type { CaseStatus } from '../types/case.types';
import { EntitiesCombobox, PathologistsCombobox, TestsCombobox } from '@/shared/components/lists';

interface CasesFiltersBarProps {
    filters: CaseListFilters;
    onFiltersChange: (updates: Partial<CaseListFilters>) => void;
    isLoading?: boolean;
    canExport?: boolean;
    onExport: () => void;
    onSearch: (filters: CaseListFilters) => void;
    onClear: () => void;
    lockedPathologist?: string;
    lockedIdentificationNumber?: string;
    isPaciente?: boolean;
    selectedCases?: Case[];
    onPrintSelected?: () => void;
    onDeliverSelected?: () => void;
}

const OPPORTUNITY_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'fuera', label: 'Fuera' },
    { value: 'dentro', label: 'Dentro' },
];

const PRIORITY_OPTIONS = [
    { value: '', label: 'Todas' },
    { value: 'normal', label: 'Normal' },
    { value: 'prioritario', label: 'Prioritario' }
];

const STATUS_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'En recepción', label: 'En recepción' },
    { value: 'Corte macro', label: 'Corte macro' },
    { value: 'Descrip micro', label: 'Descrip micro' },
    { value: 'Por firmar', label: 'Por firmar' },
    { value: 'Por entregar', label: 'Por entregar' },
    { value: 'Completado', label: 'Completado' }
];

export function CasesFiltersBar({
    filters,
    onFiltersChange,
    isLoading = false,
    canExport = false,
    onExport,
    onSearch,
    onClear,
    lockedPathologist,
    lockedIdentificationNumber,
    isPaciente = false,
    selectedCases = [],
    onPrintSelected,
    onDeliverSelected,
}: CasesFiltersBarProps) {
    const [localFilters, setLocalFilters] = useState<CaseListFilters>(filters);
    const [pathologistId, setPathologistId] = useState('');

    useEffect(() => {
        setLocalFilters(filters);
        if (!filters.pathologist) setPathologistId('');
    }, [filters]);

    const handleLocalChange = (updates: Partial<CaseListFilters>) => {
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
                        Listado de Casos
                    </h3>
                    <span className="text-xs text-neutral-500">
                        Filtrar por código, paciente, fechas, entidad, patólogo asignado, prioridad, prueba y estado.
                    </span>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        {lockedIdentificationNumber !== undefined ? (
                            <FormField label="Documento del perfil">
                                <div className="flex h-10 w-full items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-600">
                                    <Lock className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                                    <span className="truncate">
                                        {lockedIdentificationNumber || 'Sin documento configurado'}
                                    </span>
                                </div>
                            </FormField>
                        ) : (
                            <FormField label="Buscar por código, paciente o médico">
                                <Input
                                    type="text"
                                    value={localFilters.search}
                                    onChange={e => handleLocalChange({ search: e.target.value })}
                                    onKeyPress={e => e.key === 'Enter' && handleSearchClick()}
                                    placeholder="Ej: 2026-00001, 123456789, Dr. Lopez"
                                />
                            </FormField>
                        )}
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
                        <FormField label="Oportunidad">
                            <Select
                                value={localFilters.opportunity}
                                onChange={e =>
                                    handleLocalChange({
                                        opportunity: e.target.value as '' | 'fuera' | 'dentro'
                                    })
                                }
                                options={OPPORTUNITY_OPTIONS}
                                title="Para casos en proceso, el cálculo se realiza hasta el día de hoy"
                            />
                        </FormField>
                    </div>
                </div>

                {!isPaciente && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full">
                        <div className="min-w-0">
                            <FormField label="Entidad">
                                <EntitiesCombobox
                                    value={localFilters.entity}
                                    onChange={() => { }}
                                    onEntitySelected={(_code, name) => handleLocalChange({ entity: name })}
                                    placeholder="Buscar entidad..."
                                />
                            </FormField>
                        </div>
                        <div className="min-w-0">
                            <FormField label="Patólogo asignado">
                                {lockedPathologist ? (
                                    <div className="flex h-10 w-full items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-600">
                                        <Lock className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                                        <span className="truncate">{lockedPathologist}</span>
                                    </div>
                                ) : (
                                    <PathologistsCombobox
                                        value={pathologistId}
                                        onChange={setPathologistId}
                                        onPathologistSelected={(id, name) => {
                                            setPathologistId(id);
                                            handleLocalChange({ pathologist: name });
                                        }}
                                        placeholder="Buscar patólogo..."
                                    />
                                )}
                            </FormField>
                        </div>
                        <div className="min-w-0">
                            <FormField label="Prueba">
                                <TestsCombobox
                                    value={localFilters.test}
                                    onChange={v => handleLocalChange({ test: v })}
                                    placeholder="Buscar prueba..."
                                />
                            </FormField>
                        </div>
                        <div className="min-w-0">
                            <FormField label="Prioridad">
                                <Select
                                    value={localFilters.priority}
                                    onChange={e =>
                                        handleLocalChange({
                                            priority: e.target.value as '' | 'normal' | 'prioritario'
                                        })
                                    }
                                    options={PRIORITY_OPTIONS}
                                />
                            </FormField>
                        </div>
                        <div className="min-w-0">
                            <FormField label="Estado">
                                <Select
                                    value={localFilters.status}
                                    onChange={e =>
                                        handleLocalChange({
                                            status: e.target.value as CaseStatus | ''
                                        })
                                    }
                                    options={STATUS_OPTIONS}
                                />
                            </FormField>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-2 border-t border-neutral-200">
                    <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
                        {!isPaciente && selectedCases.length > 0 && (
                            <>
                                <BaseButton
                                    size="md"
                                    variant="secondary"
                                    onClick={onPrintSelected}
                                    startIcon={<Printer className="w-4 h-4" />}
                                >
                                    Imprimir informes ({selectedCases.length})
                                </BaseButton>
                                {onDeliverSelected && selectedCases.some(c => c.status === 'Por entregar') && (
                                    <BaseButton
                                        size="md"
                                        variant="secondary"
                                        onClick={onDeliverSelected}
                                        startIcon={<PackageCheck className="w-4 h-4" />}
                                        className="text-green-700 border-green-300 hover:bg-green-50"
                                    >
                                        Entregar casos ({selectedCases.filter(c => c.status === 'Por entregar').length})
                                    </BaseButton>
                                )}
                            </>
                        )}
                        {!isPaciente && (
                            <BaseButton
                                size="md"
                                variant="secondary"
                                disabled={!canExport}
                                onClick={onExport}
                                startIcon={<FileSpreadsheet className="w-4 h-4" />}
                            >
                                Exportar a Excel
                            </BaseButton>
                        )}
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
