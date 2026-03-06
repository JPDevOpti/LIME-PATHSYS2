'use client';

import { useState, useCallback, useEffect } from 'react';
import { Patient, PatientFilters, CareType, Gender } from '../types/patient.types';
import { patientService } from '../services/patient.service';

export type PatientSortKey =
    | 'patient_code'
    | 'full_name'
    | 'identification_number'
    | 'entity'
    | 'care_type'
    | 'gender'
    | 'age'
    | 'created_at';
export type SortOrder = 'asc' | 'desc';

export interface PatientListFilters {
    search: string;
    dateFrom: string;
    dateTo: string;
    entity: string;
    care_type: CareType | '';
    gender: Gender | '';
}

const defaultFilters: PatientListFilters = {
    search: '',
    dateFrom: '',
    dateTo: '',
    entity: '',
    care_type: '',
    gender: ''
};

function toPatientFilters(f: PatientListFilters): PatientFilters {
    return {
        search: f.search.trim() || undefined,
        created_at_from: f.dateFrom ? `${f.dateFrom}T00:00:00.000Z` : undefined,
        created_at_to: f.dateTo ? `${f.dateTo}T23:59:59.999Z` : undefined,
        entity: f.entity.trim() || undefined,
        care_type: f.care_type || undefined,
        gender: f.gender || undefined
    };
}

export function usePatientList() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState<PatientListFilters>(defaultFilters);

    const [sortKey, setSortKey] = useState<PatientSortKey>('created_at');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const loadPatients = useCallback(async (overrideFilters?: PatientListFilters) => {
        setIsLoading(true);
        setError(null);
        const f = overrideFilters ?? filters;
        try {
            const skip = (currentPage - 1) * itemsPerPage;
            const apiFilters: PatientFilters = {
                ...toPatientFilters(f),
                skip,
                limit: itemsPerPage
            };
            const { data, total } = await patientService.getPatients(apiFilters);
            setPatients(data);
            setTotalItems(total);
        } catch {
            setError('Error loading patients');
            setPatients([]);
            setTotalItems(0);
        } finally {
            setIsLoading(false);
        }
    }, [filters, currentPage, itemsPerPage]);

    useEffect(() => {
        loadPatients();
    }, [loadPatients]);

    const sortBy = useCallback((key: PatientSortKey) => {
        setSortKey(key);
        setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters(defaultFilters);
        setCurrentPage(1);
    }, []);

    const getSortValue = (p: Patient, key: PatientSortKey): string | number => {
        switch (key) {
            case 'patient_code':
                return p.patient_code ?? '';
            case 'full_name':
                return p.full_name ?? '';
            case 'identification_number':
                return p.identification_number ?? '';
            case 'entity':
                return p.entity_info?.entity_name ?? '';
            case 'care_type':
                return p.care_type ?? '';
            case 'gender':
                return p.gender ?? '';
            case 'age':
                return p.age ?? 0;
            case 'created_at':
                return p.created_at ? new Date(p.created_at).getTime() : 0;
            default:
                return '';
        }
    };

    const sortedPatients = [...patients].sort((a, b) => {
        const va = getSortValue(a, sortKey);
        const vb = getSortValue(b, sortKey);
        const cmp = typeof va === 'string' && typeof vb === 'string'
            ? va.localeCompare(vb, 'es')
            : (va as number) - (vb as number);
        return sortOrder === 'asc' ? cmp : -cmp;
    });

    const totalPages = itemsPerPage > 0
        ? Math.max(1, Math.ceil(totalItems / itemsPerPage))
        : 1;
    const paginatedPatients = sortedPatients;

    const updateFilters = useCallback((updates: Partial<PatientListFilters>) => {
        setFilters(prev => ({ ...prev, ...updates }));
        setCurrentPage(1);
    }, []);

    const applySearch = useCallback((overrideFilters?: PatientListFilters) => {
        setCurrentPage(1);
        loadPatients(overrideFilters);
    }, [loadPatients]);

    const setCurrentPageAndLoad = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    const setItemsPerPageAndLoad = useCallback((value: number) => {
        setItemsPerPage(value);
        setCurrentPage(1);
    }, []);

    const getFilteredDataForExport = useCallback(async () => {
        return patientService.getAllPatientsForExport(toPatientFilters(filters));
    }, [filters]);

    return {
        patients,
        isLoading,
        error,
        filters,
        setFilters: updateFilters,
        sortKey,
        sortOrder,
        currentPage,
        setCurrentPage: setCurrentPageAndLoad,
        itemsPerPage,
        setItemsPerPage: setItemsPerPageAndLoad,
        filteredPatients: sortedPatients,
        paginatedPatients,
        totalPages,
        totalItems,
        loadPatients,
        sortBy,
        clearFilters,
        applySearch,
        getFilteredDataForExport
    };
}
