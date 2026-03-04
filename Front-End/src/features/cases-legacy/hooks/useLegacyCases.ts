'use client';

import { useState, useEffect } from 'react';
import { legacyCasesService } from '../services/cases-legacy.service';
import { LegacyCaseFilters, LegacyCaseListResponse } from '../types/case-legacy.types';

export function useLegacyCases(filters: LegacyCaseFilters) {
    const [data, setData] = useState<LegacyCaseListResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let mounted = true;
        setIsLoading(true);
        setError(null);

        legacyCasesService.getCases(filters)
            .then(res => {
                if (mounted) setData(res);
            })
            .catch(err => {
                if (mounted) setError(err instanceof Error ? err : new Error('Unknown error'));
            })
            .finally(() => {
                if (mounted) setIsLoading(false);
            });

        return () => { mounted = false; };
    }, [filters]);

    return { data, isLoading, isError: !!error, error };
}

export function useLegacyAvailableEntities() {
    const [data, setData] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        setIsLoading(true);

        legacyCasesService.getAvailableEntities()
            .then(res => {
                if (mounted) setData(res);
            })
            .catch(() => {
                if (mounted) setData([]);
            })
            .finally(() => {
                if (mounted) setIsLoading(false);
            });

        return () => { mounted = false; };
    }, []);

    return { data, isLoading };
}
