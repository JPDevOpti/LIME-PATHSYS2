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
    /** true = sin filtro por entidad (Todos marcado). */
    entityTodosAll: boolean;
    /** Nombres de entidad en OR cuando `entityTodosAll` es false y hay selección. */
    entityIncludedNames: string[];
    pathologistTodosAll: boolean;
    pathologistIncludedNames: string[];
    priority: CasePriority | '';
    /** true = sin filtro por prueba (Todos). */
    testTodosAll: boolean;
    /** Códigos de prueba en OR cuando `testTodosAll` es false y hay selección. */
    testIncludedCodes: string[];
    /** true = sin filtro por estado (Todos). */
    statusTodosAll: boolean;
    /** Estados en OR cuando `statusTodosAll` es false y hay selección. */
    statusIncluded: CaseStatus[];
    patientId: string;
    identificationNumber: string;
    opportunity: 'fuera' | 'dentro' | '';
}

const defaultFilters: CaseListFilters = {
    search: '',
    dateFrom: '',
    dateTo: '',
    entityTodosAll: true,
    entityIncludedNames: [],
    pathologistTodosAll: true,
    pathologistIncludedNames: [],
    priority: '',
    testTodosAll: true,
    testIncludedCodes: [],
    statusTodosAll: true,
    statusIncluded: [],
    patientId: '',
    identificationNumber: '',
    opportunity: '',
};

export function makeDefaultFilters(overrides?: Partial<CaseListFilters>): CaseListFilters {
    return { ...defaultFilters, ...overrides };
}

function toCaseFilters(f: CaseListFilters): CaseFilters {
    const df = f.dateFrom?.trim();
    const dt = f.dateTo?.trim();
    const entityNames =
        !f.entityTodosAll && f.entityIncludedNames.length > 0 ? f.entityIncludedNames : undefined;
    const pathNames =
        !f.pathologistTodosAll && f.pathologistIncludedNames.length > 0
            ? f.pathologistIncludedNames
            : undefined;
    const testCodes =
        !f.testTodosAll && f.testIncludedCodes.length > 0
            ? f.testIncludedCodes.map(c => c.trim()).filter(Boolean)
            : undefined;
    const states =
        !f.statusTodosAll && f.statusIncluded.length > 0 ? [...f.statusIncluded] : undefined;
    return {
        search: f.search.trim() || undefined,
        // Solo YYYY-MM-DD: el API usa día civil en Colombia (America/Bogota) y convierte a UTC para Mongo
        created_at_from: df || undefined,
        created_at_to: dt || undefined,
        entity_names: entityNames,
        assigned_pathologist_names: pathNames,
        priority: f.priority || undefined,
        test_codes: testCodes,
        ...(states ? { states } : {}),
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
