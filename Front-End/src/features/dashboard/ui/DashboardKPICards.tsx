'use client';

import { Users, ClipboardPlus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BaseCard } from '@/shared/components/base/BaseCard';
import type { DashboardMetrics, MetricDetail } from '../model/dashboard.types';

type DashboardKPICardsProps = {
  metrics: DashboardMetrics;
};

const KPICard = ({
  title,
  metric,
  icon: Icon,
}: {
  title: string;
  metric: MetricDetail;
  icon: React.ElementType;
}) => {
  const isPositive = metric.cambio_porcentual >= 0;

  return (
    <BaseCard className="relative overflow-hidden h-full">
      <div className="flex items-center gap-6">
        <div className="rounded-xl bg-gray-50 p-4 shrink-0">
          <Icon className="h-8 w-8 text-gray-600" />
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-medium text-neutral-500 truncate">{title}</span>

          <span className="text-3xl font-bold text-neutral-900 leading-none mt-1">
            {metric.mes_actual}
          </span>

          <div className="flex items-center gap-2 mt-2">
            <div
              className={`flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${isPositive
                ? 'bg-success-50 text-success-700'
                : 'bg-danger-50 text-danger-700'
                }`}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              <span>{Math.abs(metric.cambio_porcentual)}%</span>
            </div>
            <p className="text-xs text-neutral-400">vs mes anterior</p>
          </div>
        </div>
      </div>
      {/* Decorative background element */}
      <div className="absolute -right-6 -bottom-6 -z-10 h-32 w-32 rounded-full bg-linear-to-br from-emerald-50/50 to-transparent blur-2xl opacity-60" />
    </BaseCard>
  );
};

export const DashboardKPICards = ({ metrics }: DashboardKPICardsProps) => {
  return (
    <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      <KPICard
        title="Pacientes Mensuales"
        metric={metrics.pacientes}
        icon={Users}
      />
      <KPICard
        title="Casos Mensuales"
        metric={metrics.casos}
        icon={ClipboardPlus}
      />
    </div>
  );
};
