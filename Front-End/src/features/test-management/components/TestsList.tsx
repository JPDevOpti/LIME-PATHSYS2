'use client';

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle } from 'lucide-react';
import { TestsFilters } from './TestsFilters';
import { TestsTable } from './TestsTable';
import { CreateTestModal } from './CreateTestModal';
import { EditTestModal } from './EditTestModal';
import { labTestsService } from '../services/lab-tests.service';
import type { LabTest } from '../types/lab-tests.types';
import type { TestsFilters as TestsFiltersType } from '../types/tests-filters.types';

const INITIAL_FILTERS: TestsFiltersType = {
    searchQuery: '',
    status: '',
    priceRange: '',
    daysRange: '',
};

const DEFAULT_PAGE_SIZE = 20;

export function TestsList() {
    const [tests, setTests] = useState<LabTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [filters, setFilters] = useState<TestsFiltersType>(INITIAL_FILTERS);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editTest, setEditTest] = useState<LabTest | null>(null);

    const loadTests = async () => {
        setLoading(true);
        try {
            const list = await labTestsService.getAll(true);
            setTests(list);
        } catch (e) {
            console.error('Error cargando pruebas:', e);
            setTests([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTests();
    }, []);

    const filteredTests = useMemo(() => {
        let result = [...tests];

        const q = filters.searchQuery.trim().toLowerCase();
        if (q) {
            result = result.filter(
                (t) =>
                    t.name?.toLowerCase().includes(q) ||
                    t.test_code?.toLowerCase().includes(q)
            );
        }

        if (filters.status === 'activo') {
            result = result.filter((t) => t.is_active);
        } else if (filters.status === 'inactivo') {
            result = result.filter((t) => !t.is_active);
        }

        if (filters.priceRange) {
            const [minStr, maxStr] = filters.priceRange.split('-');
            const priceMin = minStr ? Number(minStr) : 0;
            const priceMax = maxStr ? Number(maxStr) : Infinity;
            result = result.filter((t) => t.price >= priceMin && t.price <= priceMax);
        }

        if (filters.daysRange) {
            const [minStr, maxStr] = filters.daysRange.split('-');
            const daysMin = minStr ? Number(minStr) : 0;
            const daysMax = maxStr ? Number(maxStr) : Infinity;
            result = result.filter((t) => t.time >= daysMin && t.time <= daysMax);
        }

        return result;
    }, [tests, filters]);

    const totalPages = Math.max(1, Math.ceil(filteredTests.length / itemsPerPage));
    const paginatedTests = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredTests.slice(start, start + itemsPerPage);
    }, [filteredTests, currentPage, itemsPerPage]);

    const handleSearch = () => {
        setCurrentPage(1);
    };

    const handleClear = () => {
        setFilters(INITIAL_FILTERS);
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (value: number) => {
        setItemsPerPage(value);
        setCurrentPage(1);
    };

    const handleCreate = async () => {
        await loadTests();
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };

    const handleUpdate = async () => {
        await loadTests();
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };

    const handleInactivate = async (test: LabTest) => {
        await labTestsService.update(test.test_code, { is_active: false });
        await loadTests();
    };

    const handleActivate = async (test: LabTest) => {
        await labTestsService.update(test.test_code, { is_active: true });
        await loadTests();
    };

    return (
        <>
            <div className="flex flex-col gap-4">
                {loadError && (
                    <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {loadError}
                    </div>
                )}
                <TestsFilters
                    filters={filters}
                    onFiltersChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
                    onSearch={handleSearch}
                    onClear={handleClear}
                    onNewTest={() => setShowCreateModal(true)}
                    loading={loading}
                />

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-brand-600 border-t-transparent" />
                    </div>
                ) : (
                    <TestsTable
                        tests={paginatedTests}
                        total={filteredTests.length}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        onEdit={setEditTest}
                        onInactivate={handleInactivate}
                        onActivate={handleActivate}
                        noResultsMessage={
                            tests.length === 0
                                ? 'No hay pruebas creadas. Cree una nueva para comenzar.'
                                : 'No se encontraron pruebas con los filtros aplicados.'
                        }
                    />
                )}
            </div>

            <CreateTestModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSave={handleCreate}
            />

            <EditTestModal
                test={editTest}
                onClose={() => setEditTest(null)}
                onSave={handleUpdate}
            />

            {showSuccessToast && (
                <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Prueba guardada correctamente</span>
                </div>
            )}
        </>
    );
}
