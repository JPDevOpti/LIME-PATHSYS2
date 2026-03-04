'use client';

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle } from 'lucide-react';
import { EntitiesFilters } from './EntitiesFilters';
import { EntitiesTable } from './EntitiesTable';
import { CreateEntityModal } from './CreateEntityModal';
import { EditEntityModal } from './EditEntityModal';
import { entitiesService } from '../services/entities.service';
import type { Entity } from '../types/entity.types';
import type { EntitiesFilters as EntitiesFiltersType } from '../types/entities-filters.types';

const INITIAL_FILTERS: EntitiesFiltersType = {
    searchQuery: '',
    status: '',
};

const DEFAULT_PAGE_SIZE = 20;

export function EntitiesList() {
    const [entities, setEntities] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [filters, setFilters] = useState<EntitiesFiltersType>(INITIAL_FILTERS);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editEntity, setEditEntity] = useState<Entity | null>(null);

    const loadEntities = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const list = await entitiesService.getAll(true);
            setEntities(list);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error al cargar entidades';
            setLoadError(msg);
            setEntities([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEntities();
    }, []);

    const filteredEntities = useMemo(() => {
        let result = [...entities];

        const q = filters.searchQuery.trim().toLowerCase();
        if (q) {
            result = result.filter(
                (e) =>
                    e.name?.toLowerCase().includes(q) ||
                    e.code?.toLowerCase().includes(q)
            );
        }

        if (filters.status === 'activo') {
            result = result.filter((e) => e.is_active);
        } else if (filters.status === 'inactivo') {
            result = result.filter((e) => !e.is_active);
        }

        return result;
    }, [entities, filters]);

    const totalPages = Math.max(1, Math.ceil(filteredEntities.length / itemsPerPage));
    const paginatedEntities = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredEntities.slice(start, start + itemsPerPage);
    }, [filteredEntities, currentPage, itemsPerPage]);

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
        await loadEntities();
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };

    const handleUpdate = async () => {
        await loadEntities();
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };

    const handleInactivate = async (entity: Entity) => {
        await entitiesService.update(entity.code, { is_active: false });
        await loadEntities();
    };

    const handleActivate = async (entity: Entity) => {
        await entitiesService.update(entity.code, { is_active: true });
        await loadEntities();
    };

    return (
        <>
            <div className="flex flex-col gap-4">
                <EntitiesFilters
                    filters={filters}
                    onFiltersChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
                    onSearch={handleSearch}
                    onClear={handleClear}
                    onNewEntity={() => setShowCreateModal(true)}
                    loading={loading}
                />

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-brand-600 border-t-transparent" />
                    </div>
                ) : (
                    <EntitiesTable
                        entities={paginatedEntities}
                        total={filteredEntities.length}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        onEdit={setEditEntity}
                        onInactivate={handleInactivate}
                        onActivate={handleActivate}
                        noResultsMessage={
                            entities.length === 0
                                ? 'No hay entidades creadas. Cree una nueva para comenzar.'
                                : 'No se encontraron entidades con los filtros aplicados.'
                        }
                    />
                )}
            </div>

            <CreateEntityModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSave={handleCreate}
            />

            <EditEntityModal
                entity={editEntity}
                onClose={() => setEditEntity(null)}
                onSave={handleUpdate}
            />

            {showSuccessToast && (
                <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Entidad guardada correctamente</span>
                </div>
            )}
        </>
    );
}
