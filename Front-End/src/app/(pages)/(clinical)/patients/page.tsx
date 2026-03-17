'use client';

import { useState } from 'react';
import { BaseButton, BaseCard } from '@/shared/components/base';
import { PatientsFiltersBar } from '@/features/patients/components/PatientsFiltersBar';
import { PatientsTable } from '@/features/patients/components/PatientsTable';
import { PatientDetailsModal } from '@/features/patients/components/PatientDetailsModal';
import { usePatientList } from '@/features/patients/hooks/usePatientList';
import type { Patient } from '@/features/patients/types/patient.types';
import { exportPatientsToExcel } from '@/shared/utils/excelExport';

const COLUMNS = [
    { key: 'patient_code' as const, label: 'Código', class: 'w-[10%]' },
    { key: 'full_name' as const, label: 'Paciente', class: 'w-[20%]' },
    { key: 'entity' as const, label: 'Entidad', class: 'w-[18%]' },
    { key: 'care_type' as const, label: 'Tipo atención', class: 'w-[12%]' },
    { key: 'gender' as const, label: 'Sexo', class: 'w-[10%]' },
    { key: 'age' as const, label: 'Edad', class: 'w-[10%]' },
    { key: 'created_at' as const, label: 'Fecha creación', class: 'w-[12%]' }
];

export default function PatientsListPage() {
    const [detailPatient, setDetailPatient] = useState<Patient | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const {
        isLoading,
        error,
        filters,
        setFilters,
        sortKey,
        sortOrder,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        filteredPatients,
        totalPages,
        totalItems,
        loadPatients,
        sortBy,
        clearFilters,
        applySearch,
        getFilteredDataForExport
    } = usePatientList();

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const data = await getFilteredDataForExport();
            if (data.length === 0) {
                alert('No hay datos para exportar con los filtros actuales');
                return;
            }
            await exportPatientsToExcel(data);
        } catch (err) {
            console.error(err);
            alert('Error al exportar los datos');
        } finally {
            setIsExporting(false);
        }
    };

    const hasActiveFilters =
        !!filters.search ||
        !!filters.dateFrom ||
        !!filters.dateTo ||
        !!filters.entity ||
        !!filters.care_type ||
        !!filters.gender;

    const noResultsMessage = hasActiveFilters
        ? 'No se encontraron pacientes con los filtros aplicados'
        : 'No hay pacientes disponibles';

    return (
        <div className="flex flex-col gap-4">
            <PatientsFiltersBar
                filters={filters}
                onFiltersChange={setFilters}
                isLoading={isLoading || isExporting}
                canExport={totalItems > 0 && !isExporting}
                onExport={handleExport}
                onSearch={applySearch}
                onClear={clearFilters}
            />

            {isLoading && (
                <BaseCard className="p-8">
                    <div className="flex justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-brand-600 border-t-transparent" />
                    </div>
                </BaseCard>
            )}

            {error && !isLoading && (
                <BaseCard className="p-8">
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-red-600">{error}</p>
                        <BaseButton size="sm" variant="primary" onClick={() => loadPatients()}>
                            Retry
                        </BaseButton>
                    </div>
                </BaseCard>
            )}

            {!isLoading && !error && (
                <PatientsTable
                    patients={filteredPatients}
                    columns={COLUMNS}
                    sortKey={sortKey}
                    sortOrder={sortOrder}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalItems={totalItems}
                    noResultsMessage={noResultsMessage}
                    onSort={sortBy}
                    onPrevPage={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    onNextPage={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    onItemsPerPageChange={setItemsPerPage}
                    onViewDetails={p => setDetailPatient(p)}
                />
            )}

            <PatientDetailsModal
                visible={!!detailPatient}
                patient={detailPatient}
                onClose={() => setDetailPatient(null)}
            />
        </div>
    );
}
