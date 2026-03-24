'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle } from 'lucide-react';
import { ProfilesFilters } from './ProfilesFilters';
import { ProfilesTable } from './ProfilesTable';
import { CreateProfileModal } from './CreateProfileModal';
import { EditProfileModal } from './EditProfileModal';
import { profilesService } from '../services/profiles.service';
import type { Profile, ProfileFilters, CreateProfilePayload, UpdateProfilePayload } from '../types/profile.types';

const INITIAL_FILTERS: ProfileFilters = {
    searchQuery: '',
    role: '',
    status: '',
    dateFrom: '',
    dateTo: '',
};

const DEFAULT_PAGE_SIZE = 20;

export function ProfilesList() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [filters, setFilters] = useState<ProfileFilters>(INITIAL_FILTERS);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editProfile, setEditProfile] = useState<Profile | null>(null);

    const loadProfiles = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const skip = (currentPage - 1) * itemsPerPage;
            
            // Mapeo de filtros de UI a parámetros de API
            let isActive: boolean | undefined = undefined;
            if (filters.status === 'activo') isActive = true;
            else if (filters.status === 'inactivo') isActive = false;

            const response = await profilesService.list({
                skip,
                limit: itemsPerPage,
                search: filters.searchQuery,
                role: filters.role,
                is_active: isActive
            });

            setProfiles(response.data);
            setTotal(response.total);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error al cargar perfiles';
            setLoadError(msg);
            setProfiles([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, filters]);

    useEffect(() => {
        loadProfiles();
    }, [loadProfiles]);

    const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

    const handleSearch = () => {
        setCurrentPage(1);
        loadProfiles();
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

    const handleCreate = async (payload: CreateProfilePayload) => {
        await profilesService.create(payload);
        await loadProfiles();
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };

    const handleUpdate = async (payload: UpdateProfilePayload) => {
        if (!editProfile) return;
        await profilesService.update(editProfile.id, payload);
        setEditProfile(null);
        await loadProfiles();
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    };

    const handleInactivate = async (profile: Profile) => {
        await profilesService.update(profile.id, { isActive: false });
        await loadProfiles();
    };

    const handleActivate = async (profile: Profile) => {
        await profilesService.update(profile.id, { isActive: true });
        await loadProfiles();
    };

    return (
        <>
            <div className="flex flex-col gap-4">
                {loadError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-4">
                        <span>{loadError}</span>
                        <button
                            type="button"
                            onClick={() => loadProfiles()}
                            className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                            Reintentar
                        </button>
                    </div>
                )}
                <ProfilesFilters
                    filters={filters}
                    onFiltersChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
                    onSearch={handleSearch}
                    onClear={handleClear}
                    onNewProfile={() => setShowCreateModal(true)}
                    loading={loading}
                />

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-brand-600 border-t-transparent" />
                    </div>
                ) : (
                    <ProfilesTable
                        profiles={profiles}
                        total={total}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        onEdit={setEditProfile}
                        onInactivate={handleInactivate}
                        onActivate={handleActivate}
                        noResultsMessage={
                            total === 0
                                ? 'No se encontraron perfiles con los filtros aplicados.'
                                : 'Cargando perfiles...'
                        }
                    />
                )}
            </div>

            <CreateProfileModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSave={handleCreate}
            />

            <EditProfileModal
                profile={editProfile}
                onClose={() => setEditProfile(null)}
                onSave={handleUpdate}
            />

            {showSuccessToast && (
                <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Perfil guardado correctamente</span>
                </div>
            )}
        </>
    );
}
