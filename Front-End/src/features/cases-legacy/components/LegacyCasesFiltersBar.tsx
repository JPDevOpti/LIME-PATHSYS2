import { Search, Filter, X } from 'lucide-react';
import { LegacyCaseFilters } from '../types/case-legacy.types';
import { useLegacyAvailableEntities } from '../hooks/useLegacyCases';
import { useState, useEffect } from 'react';

interface LegacyCasesFiltersBarProps {
    filters: LegacyCaseFilters;
    onSearch: (filters: LegacyCaseFilters) => void;
    onClear: () => void;
    totalItems: number;
}

export function LegacyCasesFiltersBar({ filters, onSearch, onClear, totalItems }: LegacyCasesFiltersBarProps) {
    const { data: entities = [] } = useLegacyAvailableEntities();
    const [localFilters, setLocalFilters] = useState<LegacyCaseFilters>(filters);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handleApply = () => {
        onSearch(localFilters);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApply();
    };

    const hasActiveFilters = !!localFilters.search || !!localFilters.entity || !!localFilters.received_from || !!localFilters.received_to;

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Buscar por paciente o código
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={localFilters.search || ''}
                            onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
                            onKeyDown={handleKeyDown}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-lime-brand-500 focus:border-lime-brand-500"
                            placeholder="Ej. Juan Perez, 123456789, L24-001"
                        />
                    </div>
                </div>

                {/* Entity */}
                <div className="w-full lg:w-64">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Entidad
                    </label>
                    <select
                        value={localFilters.entity || ''}
                        onChange={(e) => setLocalFilters({ ...localFilters, entity: e.target.value })}
                        className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-lg text-sm focus:ring-lime-brand-500 focus:border-lime-brand-500"
                    >
                        <option value="">Todas las entidades</option>
                        {entities.map((ent: string) => (
                            <option key={ent} value={ent}>{ent}</option>
                        ))}
                    </select>
                </div>

                {/* Dates */}
                <div className="w-full lg:w-40">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Desde
                    </label>
                    <input
                        type="date"
                        value={localFilters.received_from ? localFilters.received_from.split('T')[0] : ''}
                        onChange={(e) => {
                            const val = e.target.value ? new Date(e.target.value).toISOString() : '';
                            setLocalFilters({ ...localFilters, received_from: val });
                        }}
                        className="block w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-lime-brand-500 focus:border-lime-brand-500"
                    />
                </div>
                <div className="w-full lg:w-40">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        Hasta
                    </label>
                    <input
                        type="date"
                        value={localFilters.received_to ? localFilters.received_to.split('T')[0] : ''}
                        onChange={(e) => {
                            const val = e.target.value ? new Date(e.target.value).toISOString() : '';
                            setLocalFilters({ ...localFilters, received_to: val });
                        }}
                        className="block w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-lime-brand-500 focus:border-lime-brand-500"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-end gap-2">
                    <button
                        type="button"
                        onClick={handleApply}
                        className="px-4 py-2 bg-lime-brand-600 text-white rounded-lg text-sm font-medium hover:bg-lime-brand-700 transition flex items-center gap-2"
                    >
                        <Filter className="w-4 h-4" />
                        Filtrar
                    </button>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition flex items-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                    Mostrando <span className="font-medium text-gray-900">{totalItems}</span> casos históricos resultantes
                </span>
            </div>
        </div>
    );
}
