'use client';

import { useState } from 'react';
import { BaseCard } from '@/shared/components/base';
import { LegacyCasesFiltersBar } from '@/features/cases-legacy/components/LegacyCasesFiltersBar';
import { LegacyCasesTable } from '@/features/cases-legacy/components/LegacyCasesTable';
import { LegacyCaseDetailsModal } from '@/features/cases-legacy/components/LegacyCaseDetailsModal';
import { useLegacyCases } from '@/features/cases-legacy/hooks/useLegacyCases';
import { LegacyCase, LegacyCaseFilters } from '@/features/cases-legacy/types/case-legacy.types';
import { History } from 'lucide-react';

export default function LegacyCasesPage() {
    const [filters, setFilters] = useState<LegacyCaseFilters>({
        skip: 0,
        limit: 25,
    });

    const [selectedCase, setSelectedCase] = useState<LegacyCase | null>(null);

    const { data, isLoading, isError, error } = useLegacyCases(filters);

    const handleSearch = (newFilters: LegacyCaseFilters) => {
        setFilters({
            ...newFilters,
            skip: 0,
            limit: filters.limit
        });
    };

    const handleClear = () => {
        setFilters({
            skip: 0,
            limit: filters.limit
        });
    };

    const handlePrevPage = () => {
        if ((filters.skip || 0) > 0) {
            setFilters({ ...filters, skip: Math.max(0, (filters.skip || 0) - (filters.limit || 25)) });
        }
    };

    const handleNextPage = () => {
        const total = data?.total || 0;
        const currentSkip = filters.skip || 0;
        const limit = filters.limit || 25;
        if (currentSkip + limit < total) {
            setFilters({ ...filters, skip: currentSkip + limit });
        }
    };

    const handleItemsPerPageChange = (limit: number) => {
        setFilters({ ...filters, limit, skip: 0 }); // Reset to page 1
    };

    const currentPage = Math.floor((filters.skip || 0) / (filters.limit || 25)) + 1;
    const totalPages = Math.ceil((data?.total || 0) / (filters.limit || 25));

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] w-full mx-auto pb-10 mt-6 lg:mt-8 px-4 sm:px-6 lg:px-8">


            <LegacyCasesFiltersBar
                filters={filters}
                onSearch={handleSearch}
                onClear={handleClear}
                totalItems={data?.total || 0}
            />

            {isLoading && (
                <BaseCard className="p-8">
                    <div className="flex justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-brand-600 border-t-transparent" />
                    </div>
                </BaseCard>
            )}

            {isError && !isLoading && (
                <BaseCard className="p-8">
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-red-600">Error al cargar los casos históricos: {(error as Error)?.message || 'Error desconocido'}</p>
                    </div>
                </BaseCard>
            )}

            {!isLoading && !isError && data && (
                <LegacyCasesTable
                    cases={data.data}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={filters.limit || 25}
                    totalItems={data.total}
                    noResultsMessage={
                        (filters.search || filters.entity || filters.received_from || filters.received_to)
                            ? 'No se encontraron casos históricos con los filtros aplicados'
                            : 'Seleccione filtros o inicie la búsqueda para ver casos históricos'
                    }
                    onPrevPage={handlePrevPage}
                    onNextPage={handleNextPage}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    onViewDetails={(caseData) => setSelectedCase(caseData)}
                />
            )}

            <LegacyCaseDetailsModal
                visible={!!selectedCase}
                caseData={selectedCase}
                onClose={() => setSelectedCase(null)}
            />
        </div>
    );
}
