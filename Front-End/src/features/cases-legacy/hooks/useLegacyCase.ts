'use client';

import { useState, useEffect } from 'react';
import { legacyCasesService } from '../services/cases-legacy.service';
import { LegacyCase } from '../types/case-legacy.types';

export function useLegacyCase(id: string | null) {
    const [data, setData] = useState<LegacyCase | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!id) {
            setData(null);
            return;
        }

        let mounted = true;
        setIsLoading(true);
        setError(null);

        legacyCasesService.getCaseById(id)
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
    }, [id]);

    return { data, isLoading, isError: !!error, error };
}
