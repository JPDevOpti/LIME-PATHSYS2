'use client';

import type { ReactNode } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { twMerge } from 'tailwind-merge';

import { defaultChartColors } from './chart-colors';

type PieDatum = {
  name: string;
  value: number;
  [key: string]: string | number;
};

type BasePieChartProps = {
  data: PieDatum[];
  dataKey?: string;
  nameKey?: string;
  height?: number;
  innerRadius?: number | string;
  outerRadius?: number | string;
  colors?: string[];
  showLegend?: boolean;
  showTooltip?: boolean;
  tooltipFormatter?: (value: number, name: string) => ReactNode;
  centerLabel?: ReactNode;
  legendTextColor?: string;
  className?: string;
};

const tooltipStyles = {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  border: '1px solid #E4E7EC',
  boxShadow: '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
};

function BasePieChart({
  data,
  dataKey = 'value',
  nameKey = 'name',
  height = 320,
  innerRadius = 60,
  outerRadius = 100,
  colors = defaultChartColors,
  showLegend = true,
  showTooltip = true,
  tooltipFormatter,
  centerLabel,
  legendTextColor = '#000000',
  className,
}: BasePieChartProps) {
  const hasData = data?.length > 0;

  const renderCenterLabel =
    centerLabel &&
    ((props: { cx?: number; cy?: number }) => {
      const { cx = 0, cy = 0 } = props;
      return (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: 24, fontWeight: 700, fill: '#101828' }}
        >
          {centerLabel}
        </text>
      );
    });

  return (
    <div className={twMerge('relative w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          {showTooltip ? (
            <Tooltip
              contentStyle={tooltipStyles}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                const numericValue = typeof value === 'number' ? value : Number(value);
                if (tooltipFormatter) {
                  return tooltipFormatter(Number.isNaN(numericValue) ? 0 : numericValue, name as string);
                }

                return Number.isNaN(numericValue) ? value : numericValue;
              }}
            />
          ) : null}
          {showLegend ? (
            <Legend
              wrapperStyle={{ paddingTop: 16 }}
              formatter={(value) => <span style={{ color: legendTextColor }}>{value}</span>}
            />
          ) : null}
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            cornerRadius={6}
            label={renderCenterLabel || undefined}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={`${entry[nameKey]}-${index}`}
                fill={colors[index % colors.length]}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {!hasData ? <EmptyState message="Sin datos para mostrar" /> : null}
    </div>
  );
}

type EmptyStateProps = {
  message: string;
};

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-white/60 text-body-sm text-neutral-500">
      {message}
    </div>
  );
}

export type { PieDatum };
export { BasePieChart };
