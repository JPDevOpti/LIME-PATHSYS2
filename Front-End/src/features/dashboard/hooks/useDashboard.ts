'use client';

import { useState, useEffect } from 'react';
import type {
    DashboardMetrics,
    CasoUrgente,
    MonthlyCasesData,
    EstadisticasOportunidad
} from '../types/dashboard.types';
import { dashboardService } from '../services/dashboard.service';

export const useDashboard = () => {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [opportunityStats, setOpportunityStats] = useState<EstadisticasOportunidad | null>(null);
    const [monthlyCases, setMonthlyCases] = useState<MonthlyCasesData | null>(null);
    const [urgentCases, setUrgentCases] = useState<CasoUrgente[]>([]);

    const [loadingMetrics, setLoadingMetrics] = useState(true);
    const [loadingOpportunity, setLoadingOpportunity] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoadingMetrics(true);
                setLoadingOpportunity(true);

                const [m, c, u, o] = await Promise.all([
                    dashboardService.getMetrics(),
                    dashboardService.getMonthlyCases(),
                    dashboardService.getUrgentCases(),
                    dashboardService.getOpportunityStats()
                ]);

                setMetrics(m);
                setMonthlyCases(c);
                setUrgentCases(u);
                setOpportunityStats(o);

            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Error al cargar datos del dashboard');
            } finally {
                setLoadingMetrics(false);
                setLoadingOpportunity(false);
            }
        };

        loadData();
    }, []);

    return {
        metrics,
        opportunityStats,
        monthlyCases,
        urgentCases,
        loadingMetrics,
        loadingOpportunity,
        error,
    };
};
