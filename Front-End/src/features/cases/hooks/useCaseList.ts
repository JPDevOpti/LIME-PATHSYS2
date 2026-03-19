'use client';

import { useState, useCallback, useEffect } from 'react';
import { Case, CaseFilters, CasePriority, CaseStatus, CaseSortKey } from '../types/case.types';
import { caseService } from '../services/case.service';

export type { CaseSortKey };
export type SortOrder = 'asc' | 'desc';

export interface CaseListFilters {
    search: string;
    dateFrom: string;
    dateTo: string;
    entity: string;
    pathologist: string;
    pathologistName: string;
    priority: CasePriority | '';
    test: string;
    status: CaseStatus | '';
    patientId: string;
    identificationNumber: string;
    opportunity: 'fuera' | 'dentro' | '';
}

const defaultFilters: CaseListFilters = {
    search: '',
    dateFrom: '',
    dateTo: '',
    entity: '',
    pathologist: '',
    pathologistName: '',
    priority: '',
    test: '',
    status: '',
    patientId: '',
    identificationNumber: '',
    opportunity: '',
};

export function makeDefaultFilters(overrides?: Partial<CaseListFilters>): CaseListFilters {
    return { ...defaultFilters, ...overrides };
}

function toCaseFilters(f: CaseListFilters): CaseFilters {
    return {
        search: f.search.trim() || undefined,
        created_at_from: f.dateFrom ? `${f.dateFrom}T00:00:00.000Z` : undefined,
        created_at_to: f.dateTo ? `${f.dateTo}T23:59:59.999Z` : undefined,
        entity: f.entity.trim() || undefined,
        assigned_pathologist: f.pathologist.trim() || undefined,
        pathologist_name: f.pathologistName.trim() || undefined,
        priority: f.priority || undefined,
        test: f.test.trim() || undefined,
        status: f.status || undefined,
        patient_id: f.patientId.trim() || undefined,
        identification_number: f.identificationNumber.trim() || undefined,
        opportunity: f.opportunity || undefined,
    };
}

export function useCaseList(initialFilters?: Partial<CaseListFilters>) {
    const [cases, setCases] = useState<Case[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState<CaseListFilters>(() =>
        makeDefaultFilters(initialFilters)
    );

    const [sortKey, setSortKey] = useState<CaseSortKey>('case_code');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const loadCases = useCallback(
        async (
            overrideFilters?: CaseListFilters,
            overridePage?: number,
            overrideSort?: { key: CaseSortKey; order: SortOrder },
            overrideItemsPerPage?: number
        ) => {
            setIsLoading(true);
            setError(null);
            const f = overrideFilters ?? filters;
            const page = overridePage ?? currentPage;
            const limit = overrideItemsPerPage ?? itemsPerPage;
            const skip = (page - 1) * limit;
            const sort = overrideSort ?? { key: sortKey, order: sortOrder };
            try {
                const apiFilters: CaseFilters = {
                    ...toCaseFilters(f),
                    skip,
                    limit,
                    sort_by: sort.key,
                    sort_order: sort.order
                };
                const { data, total } = await caseService.getCases(apiFilters);
                setCases(data);
                setTotalItems(total);
            } catch {
                setError('Error al cargar los casos');
                setCases([]);
                setTotalItems(0);
            } finally {
                setIsLoading(false);
            }
        },
        [filters, currentPage, itemsPerPage, sortKey, sortOrder]
    );

    useEffect(() => {
        loadCases();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sortBy = useCallback(
        (key: CaseSortKey) => {
            const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            setSortKey(key);
            setSortOrder(newOrder);
            setCurrentPage(1);
            loadCases(undefined, 1, { key, order: newOrder });
        },
        [sortOrder, loadCases]
    );

    const baseFilters = makeDefaultFilters(initialFilters);

    const clearFilters = useCallback(() => {
        setFilters(baseFilters);
        setCurrentPage(1);
        loadCases(baseFilters, 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadCases]);

    const totalPages = itemsPerPage > 0 ? Math.max(1, Math.ceil(totalItems / itemsPerPage)) : 1;

    const updateFilters = useCallback((updates: Partial<CaseListFilters>) => {
        setFilters(prev => ({ ...prev, ...updates }));
        setCurrentPage(1);
    }, []);

    const applySearch = useCallback((overrideFilters?: CaseListFilters) => {
        loadCases(overrideFilters, 1);
    }, [loadCases]);

    const goToPage = useCallback(
        (page: number) => {
            const p = Math.max(1, Math.min(page, totalPages));
            setCurrentPage(p);
            loadCases(undefined, p);
        },
        [totalPages, loadCases]
    );

    const changeItemsPerPage = useCallback(
        (n: number) => {
            setItemsPerPage(n);
            setCurrentPage(1);
            loadCases(undefined, 1, undefined, n);
        },
        [loadCases]
    );

    const getFilteredDataForExport = useCallback(async () => {
        return caseService.getAllCasesForExport(toCaseFilters(filters));
    }, [filters]);

    return {
        cases,
        isLoading,
        error,
        filters,
        setFilters: updateFilters,
        sortKey,
        sortOrder,
        currentPage,
        setCurrentPage: goToPage,
        itemsPerPage,
        setItemsPerPage: changeItemsPerPage,
        totalPages,
        totalItems,
        loadCases,
        sortBy,
        clearFilters,
        applySearch,
        getFilteredDataForExport
    };
}
