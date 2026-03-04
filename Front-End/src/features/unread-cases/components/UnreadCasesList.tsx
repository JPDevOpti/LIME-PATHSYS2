'use client';

import { useState, useEffect, useCallback } from 'react';
import { BaseCard } from '@/shared/components/base';
import { UnreadCasesFilters } from './UnreadCasesFilters';
import { UnreadCasesTable } from './UnreadCasesTable';
import { UnreadCaseDetailsModal } from './UnreadCaseDetailsModal';
import { NewUnreadCaseModal } from './NewUnreadCaseModal';
import { DeliveryInfoModal } from './DeliveryInfoModal';
import { BatchMarkDeliveredModal } from './BatchMarkDeliveredModal';
import { unreadCasesService } from '../services/unread-cases.service';
import { exportJsonToExcel } from '@/shared/lib/exportExcel';
import type {
    UnreadCase,
    UnreadCaseFilters,
    UnreadCaseCreatePayload,
    UnreadCaseUpdatePayload
} from '../types/unread-cases.types';

function formatExcelDate(s?: string): string {
    if (!s) return '';
    try {
        const d = new Date(s);
        return d.toLocaleDateString('es-CO') + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return s || '';
    }
}

const INITIAL_FILTERS: UnreadCaseFilters = {
    searchQuery: '',
    dateFrom: '',
    dateTo: '',
    selectedInstitution: '',
    selectedTestType: '',
    selectedStatus: ''
};

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 25, 50, 100];

export function UnreadCasesList() {
    const [filters, setFilters] = useState<UnreadCaseFilters>(INITIAL_FILTERS);
    const [loading, setLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [cases, setCases] = useState<UnreadCase[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [detailsCase, setDetailsCase] = useState<UnreadCase | null>(null);
    const [editCase, setEditCase] = useState<UnreadCase | null>(null);
    const [deliveryCase, setDeliveryCase] = useState<UnreadCase | null>(null);
    const [showNewModal, setShowNewModal] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);

    const fetchCases = useCallback(async (filterOverride?: UnreadCaseFilters, pageOverride?: number) => {
        setLoading(true);
        try {
            const f = filterOverride || filters;
            const p = pageOverride !== undefined ? pageOverride : currentPage;
            const { items, total: t } = await unreadCasesService.list({
                page: p,
                limit: itemsPerPage,
                searchQuery: f.searchQuery.trim() || undefined,
                selectedInstitution: f.selectedInstitution || undefined,
                selectedTestType: f.selectedTestType || undefined,
                selectedStatus: f.selectedStatus || undefined,
                dateFrom: f.dateFrom || undefined,
                dateTo: f.dateTo || undefined
            });
            setCases(items);
            setTotal(t);
        } catch (e) {
            console.error('Error fetching unread cases:', e);
            setCases([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, filters]);

    useEffect(() => {
        fetchCases();
    }, [currentPage, itemsPerPage]);

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            // Fetch all cases matching filters (limit 100000)
            const { items } = await unreadCasesService.list({
                page: 1,
                limit: 100000,
                searchQuery: filters.searchQuery.trim() || undefined,
                selectedInstitution: filters.selectedInstitution || undefined,
                selectedTestType: filters.selectedTestType || undefined,
                selectedStatus: filters.selectedStatus || undefined,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined
            });

            // Prepare flattened tests for each case to calculate maxTests
            const itemsWithFlatTests = items.map(c => {
                let flatTests = c.testGroups?.flatMap(g => 
                    g.tests.map(t => ({ code: t.code, quantity: t.quantity }))
                ) || [];

                // Handle legacy fields if no structured tests found
                if (flatTests.length === 0) {
                    if (c.lowComplexityIHQ) flatTests.push({ code: c.lowComplexityIHQ, quantity: c.lowComplexityPlates || 0 });
                    if (c.highComplexityIHQ) flatTests.push({ code: c.highComplexityIHQ, quantity: c.highComplexityPlates || 0 });
                    if (c.specialIHQ) flatTests.push({ code: c.specialIHQ, quantity: c.specialPlates || 0 });
                    if (c.histochemistry) flatTests.push({ code: c.histochemistry, quantity: c.histochemistryPlates || 0 });
                }
                return { ...c, flatTests };
            });

            const maxTests = Math.max(...itemsWithFlatTests.map(c => c.flatTests.length), 0);

            const data = itemsWithFlatTests.map((c) => {
                const testObservations = c.testGroups?.map(g => g.observations).filter(Boolean).join(' | ') || '';

                const row: Record<string, any> = {
                    'ID Interno': c.id,
                    'Código de Caso': c.caseCode,
                    'Caso Especial': c.isSpecialCase ? 'Sí' : 'No',
                    'Institución': c.institution || '',
                    'Entidad (Nombre)': c.entityName || '',
                    'Entidad (Código)': c.entityCode || '',
                    'Paciente (Nombre)': c.patientName || '',
                    'Tipo Documento': c.documentType || '',
                    'Documento Paciente': c.patientDocument || '',
                    'Observaciones Pruebas': testObservations,
                    'Láminas IHQ Baja': c.lowComplexityPlates || 0,
                    'Láminas IHQ Alta': c.highComplexityPlates || 0,
                    'Láminas IHQ Especial': c.specialPlates || 0,
                    'Láminas Histoquímica': c.histochemistryPlates || 0,
                    'Total Láminas': c.numberOfPlates || 0,
                    'Fecha de Entrada': formatExcelDate(c.entryDate),
                    'Recibido por': c.receivedBy || '',
                    'Estado': c.status || '',
                    'Entregado a': c.deliveredTo || '',
                    'Fecha de Entrega': formatExcelDate(c.deliveryDate),
                    'Recibo': c.receipt || '',
                    'Notas/Observaciones': c.notes || '',
                    'Fecha de Creación': formatExcelDate(c.createdAt),
                    'Última Actualización': formatExcelDate(c.updatedAt),
                    'Actualizado por': c.updatedBy || ''
                };

                // Add test columns dynamically
                for (let i = 0; i < maxTests; i++) {
                    const test = c.flatTests[i];
                    row[`Código Prueba ${i + 1}`] = test ? test.code : '';
                    row[`Cantidad ${i + 1}`] = test ? test.quantity : '';
                }

                return row;
            });

            await exportJsonToExcel(data, {
                sheetName: 'Casos Sin Lectura',
                fileName: `casos_sin_lectura_${new Date().toISOString().split('T')[0]}.xlsx`
            });
        } catch (e) {
            console.error('Error exporting to Excel:', e);
            alert('Error al exportar a Excel');
        } finally {
            setIsExporting(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

    const handleSearch = () => {
        setCurrentPage(1);
        fetchCases(filters, 1);
    };

    const handleClear = () => {
        setFilters(INITIAL_FILTERS);
        setCurrentPage(1);
        setSelectedIds([]);
        fetchCases(INITIAL_FILTERS, 1);
    };

    const handlePageChange = (page: number) => {
        const next = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(next);
        fetchCases(filters, next);
    };

    const handleItemsPerPageChange = (value: number) => {
        setItemsPerPage(value);
        setCurrentPage(1);
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleToggleSelectAll = () => {
        if (selectedIds.length === cases.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(cases.map((c) => c.id));
        }
    };

    const handleClearSelection = () => setSelectedIds([]);

    const handleViewDetails = (c: UnreadCase) => setDetailsCase(c);
    const handleEdit = (c: UnreadCase) => setEditCase(c);
    const handleManageDelivery = (c: UnreadCase) => setDeliveryCase(c);

    const handleCreate = async (payload: UnreadCaseCreatePayload) => {
        await unreadCasesService.create(payload);
        await fetchCases();
    };

    const handleUpdate = async (payload: UnreadCaseUpdatePayload) => {
        if (!editCase) return;
        await unreadCasesService.update(editCase.caseCode, payload);
        setEditCase(null);
        await fetchCases();
        if (detailsCase?.caseCode === editCase.caseCode) {
            const updated = await unreadCasesService.get(editCase.caseCode);
            setDetailsCase(updated || null);
        }
    };

    const handleDeliverySave = async (payload: {
        deliveredTo: string;
        deliveryDate?: string;
    }) => {
        if (!deliveryCase) return;
        await unreadCasesService.markDelivered({
            caseCodes: [deliveryCase.caseCode],
            deliveredTo: payload.deliveredTo,
            deliveryDate: payload.deliveryDate
        });
        setDeliveryCase(null);
        await fetchCases();
        if (detailsCase?.caseCode === deliveryCase.caseCode) {
            const updated = await unreadCasesService.get(deliveryCase.caseCode);
            setDetailsCase(updated || null);
        }
    };

    const handleBatchSave = async (payload: {
        deliveredTo: string;
        deliveryDate?: string;
    }) => {
        const selected = cases.filter((c) => selectedIds.includes(c.id));
        if (selected.length === 0) return;
        await unreadCasesService.markDelivered({
            caseCodes: selected.map((c) => c.caseCode),
            deliveredTo: payload.deliveredTo,
            deliveryDate: payload.deliveryDate
        });
        setShowBatchModal(false);
        setSelectedIds([]);
        await fetchCases();
    };

    const selectedCases = cases.filter((c) => selectedIds.includes(c.id));

    return (
        <>
            <div className="flex flex-col gap-4">
                <UnreadCasesFilters
                    filters={filters}
                    onFiltersChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
                    onSearch={handleSearch}
                    onClear={handleClear}
                    onRefresh={fetchCases}
                    onNewCase={() => { setEditCase(null); setShowNewModal(true); }}
                    onExport={handleExportExcel}
                    loading={loading}
                    isExporting={isExporting}
                />

                <BaseCard variant="default" padding="none" className="overflow-hidden">
                    <UnreadCasesTable
                        cases={cases}
                        total={total}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsPerPage={itemsPerPage}
                        selectedIds={selectedIds}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        onToggleSelect={handleToggleSelect}
                        onToggleSelectAll={handleToggleSelectAll}
                        onClearSelection={handleClearSelection}
                        onViewDetails={handleViewDetails}
                        onEdit={handleEdit}
                        onManageDelivery={handleManageDelivery}
                        onBatchMarkDelivered={() => setShowBatchModal(true)}
                        noResultsMessage={
                            loading
                                ? 'Loading...'
                                : 'No cases found. Try adjusting your filters or create a new case.'
                        }
                    />
                </BaseCard>
            </div>

            <UnreadCaseDetailsModal
                caseData={detailsCase}
                onClose={() => setDetailsCase(null)}
                onEdit={(c) => {
                    setDetailsCase(null);
                    setEditCase(c);
                }}
                onDelete={async (c) => {
                    if (!confirm('¿Está seguro de eliminar este caso? Esta acción no se puede deshacer.')) return;
                    try {
                        await unreadCasesService.delete(c.caseCode);
                        setDetailsCase(null);
                        await fetchCases();
                    } catch (e) {
                        console.error('Error al eliminar:', e);
                    }
                }}
            />

            <NewUnreadCaseModal
                isOpen={showNewModal || !!editCase}
                onClose={() => {
                    setShowNewModal(false);
                    setEditCase(null);
                }}
                caseData={editCase}
                onCreate={handleCreate}
                onUpdate={handleUpdate}
            />

            <DeliveryInfoModal
                caseData={deliveryCase}
                onClose={() => setDeliveryCase(null)}
                onSave={handleDeliverySave}
            />

            <BatchMarkDeliveredModal
                isOpen={showBatchModal}
                selectedCases={selectedCases}
                onClose={() => setShowBatchModal(false)}
                onSave={handleBatchSave}
            />
        </>
    );
}
