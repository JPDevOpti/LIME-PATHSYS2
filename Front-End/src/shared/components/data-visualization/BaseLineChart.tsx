'use client';

import type { ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { twMerge } from 'tailwind-merge';

import { defaultChartColors } from './chart-colors';

type LineCurve = 'monotone' | 'linear' | 'step' | 'basis' | 'natural';

type LineSeries = {
  dataKey: string;
  name?: string;
  color?: string;
  strokeWidth?: number;
  type?: LineCurve;
  dot?: boolean;
  activeDotRadius?: number;
};

type Numeric = number | string;

type BaseLineChartProps<T extends Record<string, Numeric>> = {
  data: T[];
  xKey: keyof T;
  series: LineSeries[];
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  xAxisFormatter?: (value: Numeric) => string;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, name: string) => ReactNode;
  colors?: string[];
  className?: string;
};

const axisTickStyle = {
  fill: '#000000',
  fontSize: 12,
};

const axisLineStyle = {
  stroke: '#E4E7EC',
};

const gridStyle = {
  stroke: '#E4E7EC',
  strokeDasharray: '3 3',
};

const tooltipStyles = {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  border: '1px solid #E4E7EC',
  boxShadow: '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
};

function BaseLineChart<T extends Record<string, Numeric>>({
  data,
  xKey,
  series,
  height = 320,
  showLegend = true,
  showTooltip = true,
  xAxisFormatter,
  yAxisFormatter,
  tooltipFormatter,
  colors = defaultChartColors,
  className,
}: BaseLineChartProps<T>) {
  const hasData = data?.length > 0;

  return (
    <div className={twMerge('relative w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 16 }}>
          <CartesianGrid {...gridStyle} />
          <XAxis
            dataKey={xKey as string}
            axisLine={axisLineStyle}
            tickLine={false}
            tick={axisTickStyle}
            tickFormatter={xAxisFormatter}
          />
          <YAxis
            axisLine={axisLineStyle}
            tickLine={false}
            tick={axisTickStyle}
            tickFormatter={yAxisFormatter}
            width={70}
          />
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
              formatter={(value) => <span style={{ color: '#000000' }}>{value}</span>}
            />
          ) : null}
          {series.map((serie, index) => (
            <Line
              key={serie.dataKey}
              type={serie.type ?? 'monotone'}
              dataKey={serie.dataKey}
              name={serie.name}
              stroke={serie.color ?? colors[index % colors.length]}
              strokeWidth={serie.strokeWidth ?? 2}
              dot={serie.dot ?? false}
              activeDot={{ r: serie.activeDotRadius ?? 4 }}
              connectNulls
            />
          ))}
        </LineChart>
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

export type { LineSeries };
export { BaseLineChart };
