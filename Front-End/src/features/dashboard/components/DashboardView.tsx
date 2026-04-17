'use client';

import { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { DashboardKPICards } from './DashboardKPICards';
import { MonthlyCasesChart } from './MonthlyCasesChart';
import { UrgentCasesTable } from './UrgentCasesTable';
import { OportunityPercentage } from './OportunityPercentage';
import { UrgentCaseDetailsModal } from './UrgentCaseDetailsModal';
import { DonutSpinner } from '@/shared/components/ui/loading';
import type { CasoUrgente } from '../types/dashboard.types';

export default function DashboardView() {
  const {
    metrics,
    monthlyCases,
    urgentCases,
    opportunityStats,
    loadingMetrics,
    loadingOpportunity,
  } = useDashboard();

  const [selectedCase, setSelectedCase] = useState<CasoUrgente | null>(null);

  const handleOpenCase = (caseItem: CasoUrgente) => {
    setSelectedCase(caseItem);
  };

  const handleCloseCase = () => {
    setSelectedCase(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col gap-6">
          {loadingMetrics && !metrics ? (
            <DonutSpinner size="lg" wrapped minHeight="min-h-[140px]" />
          ) : metrics ? (
            <DashboardKPICards metrics={metrics} />
          ) : null}

          {loadingMetrics && !monthlyCases ? (
            <DonutSpinner size="lg" wrapped minHeight="min-h-[320px]" />
          ) : monthlyCases ? (
            <MonthlyCasesChart data={monthlyCases} />
          ) : null}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          {loadingOpportunity && !opportunityStats ? (
            <DonutSpinner size="lg" wrapped minHeight="min-h-[420px]" />
          ) : (
            <OportunityPercentage
              data={opportunityStats}
              loading={loadingOpportunity}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1">
        {loadingMetrics && urgentCases.length === 0 ? (
          <DonutSpinner size="lg" wrapped minHeight="min-h-[400px]" />
        ) : (
          <UrgentCasesTable
            cases={urgentCases}
            onViewCase={handleOpenCase}
          />
        )}
      </div>

      <UrgentCaseDetailsModal
        isOpen={!!selectedCase}
        onClose={handleCloseCase}
        caseItem={selectedCase}
      />
    </div>
  );
}
