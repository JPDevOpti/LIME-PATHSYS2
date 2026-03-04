'use client';

import { BaseCard } from '@/shared/components/base/BaseCard';
import { BaseBarChart } from '@/shared/components/data-visualization/BaseBarChart';
import type { MonthlyCasesData } from '../model/dashboard.types';

type MonthlyCasesChartProps = {
  data: MonthlyCasesData;
};

// Helper: map numeric values to month arrays
const months = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const MonthlyCasesChart = ({ data }: MonthlyCasesChartProps) => {
  // Transform flat number array into object array expected by Recharts
  const chartData = data.datos.map((value, index) => ({
    name: months[index],
    casos: value,
  }));

  // We only show data up to current month usually, or trailing 0s if future
  // For now we display all 12 points as per interface

  return (
    <BaseCard className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">
            Casos por Mes
          </h3>
          <p className="text-sm text-neutral-500">
            Comportamiento anual - {data.año}
          </p>
        </div>
        <div className="text-right">
          <span className="block text-2xl font-bold text-lime-brand-900">
            {data.total}
          </span>
          <span className="text-xs text-neutral-500">Total anual</span>
        </div>
      </div>

      <div className="w-full">
        <BaseBarChart
          height={250}
          showLegend={false}
          data={chartData}
          xKey="name"
          series={[
            {
              dataKey: 'casos',
              name: 'Casos Ingresados',
              color: '#10b981', // emerald-500
              radius: [4, 4, 0, 0],
            },
          ]}
          xAxisFormatter={(val) => String(val)}
        />
      </div>
    </BaseCard>
  );
};
