'use client';

import { useState } from 'react';
import { BaseButton, BaseCard } from '@/shared/components/base';
import { CasesFiltersBar } from '@/features/cases/components/CasesFiltersBar';
import { CasesTable } from '@/features/cases/components/CasesTable';
import { CaseDetailsModal } from '@/features/cases/components/CaseDetailsModal';
import { MarkDeliveredModal } from '@/features/cases/components/MarkDeliveredModal';
import { AssignPathologistModal } from '@/features/results/components';
import { useCaseList } from '@/features/cases/hooks/useCaseList';
import { useAuth } from '@/features/auth/context/AuthContext';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import type { Case } from '@/features/cases/types/case.types';
import type { CaseListFilters } from '@/features/cases/hooks/useCaseList';
import { caseService } from '@/features/cases/services/case.service';
import { exportCasesToExcel } from '@/shared/utils/excelExport';

const COLUMNS = [
    { key: 'case_code' as const, label: 'Código Caso', class: 'w-[16%]' },
    { key: 'patient' as const, label: 'Paciente', class: 'w-[18%]' },
    { key: 'entity' as const, label: 'Patólogo / Entidad', class: 'w-[20%]' },
    { key: 'tests' as const, label: 'Pruebas', class: 'w-[15%]' },
    { key: 'status' as const, label: 'Estado', class: 'w-[10%]' },
    { key: 'created_at' as const, label: 'Creación/Firma', class: 'w-[12%]' },
    { key: 'priority' as const, label: 'Prioridad/Días', class: 'w-[10%]' },
];

const loadingSpinner = (
    <BaseCard className="p-8">
        <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-brand-600 border-t-transparent" />
        </div>
    </BaseCard>
);

// Outer component: waits for auth to finish loading before mounting the inner page.
// This ensures user.document / user.patient_id are available when useCaseList
// initializes its filter state (useState runs only once on mount).
export default function CasesListPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { isPatologo, isPaciente, isVisitante } = usePermissions();

    if (isAuthLoading) return loadingSpinner;

    const isRestrictedView = isPaciente || isVisitante;
    const lockedPathologist = isPatologo ? (user?.name ?? '') : undefined;
    const restrictedDocument = (isVisitante || isPaciente)
        ? (user?.document?.trim() || '__NO_DOCUMENT__')
        : undefined;
    const lockedIdentificationNumber = (isVisitante || isPaciente)
        ? (user?.document?.trim() || '')
        : undefined;

    const initialListFilters: Partial<CaseListFilters> | undefined = lockedPathologist
        ? { pathologistName: lockedPathologist }
        : isVisitante
        ? { identificationNumber: restrictedDocument ?? '' }
        : isPaciente
        ? { identificationNumber: restrictedDocument ?? '', status: 'Completado' as const }
        : undefined;

    return (
        <CasesListInner
            isRestrictedView={isRestrictedView}
            lockedPathologist={lockedPathologist}
            lockedIdentificationNumber={lockedIdentificationNumber}
            initialListFilters={initialListFilters}
        />
    );
}

type CasesListInnerProps = {
    isRestrictedView: boolean;
    lockedPathologist: string | undefined;
    lockedIdentificationNumber: string | undefined;
    initialListFilters: Partial<CaseListFilters> | undefined;
};

function CasesListInner({ isRestrictedView, lockedPathologist, lockedIdentificationNumber, initialListFilters }: CasesListInnerProps) {
    const [detailCase, setDetailCase] = useState<Case | null>(null);
    const [assignPathologistCase, setAssignPathologistCase] = useState<Case | null>(null);
    const [markDeliveredCases, setMarkDeliveredCases] = useState<Case[]>([]);
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
        filteredCases,
        paginatedCases,
        totalPages,
        totalItems,
        loadCases,
        sortBy,
        clearFilters,
        applySearch,
        getFilteredDataForExport
    } = useCaseList(initialListFilters);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const data = await getFilteredDataForExport();
            if (data.length === 0) {
                alert('No hay datos para exportar con los filtros actuales');
                return;
            }
            await exportCasesToExcel(data);
        } catch (err) {
            console.error(err);
            alert('Error al exportar los datos');
        } finally {
            setIsExporting(false);
        }
    };

    const handleMarkDeliveredConfirm = async (
        deliveredTo: string,
        caseEdits: { caseId: string; tests: unknown[] }[]
    ) => {
        await caseService.markCasesDelivered(caseEdits, deliveredTo);
        setMarkDeliveredCases([]);
        loadCases();
    };

    const hasActiveFilters =
        !!filters.search ||
        !!filters.dateFrom ||
        !!filters.dateTo ||
        !!filters.entity ||
        (!lockedPathologist && (!!filters.pathologist || !!filters.pathologistName)) ||
        !!filters.priority ||
        !!filters.test ||
        !!filters.status;

    const noResultsMessage = hasActiveFilters
        ? 'No se encontraron casos con los filtros aplicados'
        : 'No hay casos disponibles';

    return (
        <div className="flex flex-col gap-4">
            <CasesFiltersBar
                filters={filters}
                onFiltersChange={setFilters}
                totalFiltered={totalItems}
                totalAll={totalItems}
                isLoading={isLoading || isExporting}
                canExport={!isRestrictedView && totalItems > 0 && !isExporting}
                onRefresh={loadCases}
                onExport={handleExport}
                onSearch={(f) => applySearch(f)}
                onClear={clearFilters}
                lockedPathologist={lockedPathologist}
                lockedIdentificationNumber={lockedIdentificationNumber}
                isPaciente={isRestrictedView}
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
                        <BaseButton size="sm" variant="primary" onClick={() => loadCases()}>
                            Reintentar
                        </BaseButton>
                    </div>
                </BaseCard>
            )}

            {!isLoading && !error && (
                <CasesTable
                    cases={paginatedCases}
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
                    onViewDetails={c => setDetailCase(c)}
                    onAssignPathologistClick={!isRestrictedView ? c => setAssignPathologistCase(c) : undefined}
                    onMarkDelivered={!isRestrictedView ? cases => setMarkDeliveredCases(cases) : undefined}
                    isPaciente={isRestrictedView}
                />
            )}

            <MarkDeliveredModal
                isOpen={markDeliveredCases.length > 0}
                cases={markDeliveredCases}
                onClose={() => setMarkDeliveredCases([])}
                onConfirm={handleMarkDeliveredConfirm}
            />

            <CaseDetailsModal
                visible={!!detailCase}
                caseData={detailCase}
                onClose={() => setDetailCase(null)}
                onCaseUpdated={(updated) => {
                    setDetailCase(updated);
                    loadCases();
                }}
            />

            {assignPathologistCase && (
                <AssignPathologistModal
                    isOpen={!!assignPathologistCase}
                    onClose={() => setAssignPathologistCase(null)}
                    caseId={assignPathologistCase.id}
                    currentPathologist={assignPathologistCase.assigned_pathologist}
                    currentAssistants={assignPathologistCase.assistant_pathologists}
                    onAssigned={() => {
                        loadCases();
                        setAssignPathologistCase(null);
                    }}
                    onAssistantsUpdated={() => {
                        loadCases();
                        setAssignPathologistCase(null);
                    }}
                />
            )}
        </div>
    );
}
