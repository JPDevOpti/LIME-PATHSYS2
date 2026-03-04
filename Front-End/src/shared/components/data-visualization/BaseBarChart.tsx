'use client';

import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { twMerge } from 'tailwind-merge';

import { defaultChartColors } from './chart-colors';

type BarSeries = {
  dataKey: string;
  name?: string;
  color?: string;
  stackId?: string;
  radius?: number | [number, number, number, number];
  fillOpacity?: number;
};

type Numeric = number | string;

type BaseBarChartProps<T extends Record<string, Numeric>> = {
  data: T[];
  xKey: keyof T;
  series: BarSeries[];
  height?: number | string;
  showLegend?: boolean;
  showTooltip?: boolean;
  xAxisFormatter?: (value: Numeric) => string;
  xAxisAngle?: number;
  xAxisMaxLabelLength?: number;
  autoRotateLongLabels?: boolean;
  xAxisInterval?: number | 'preserveStart' | 'preserveEnd' | 'preserveStartEnd';
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, name: string) => ReactNode;
  colors?: string[];
  className?: string;
  margin?: { top?: number; right?: number; left?: number; bottom?: number };
};

const DEFAULT_MAX_X_AXIS_LABEL_LENGTH = 16;
const AUTO_ROTATE_LABEL_THRESHOLD = 12;

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

function BaseBarChart<T extends Record<string, Numeric>>({
  data,
  xKey,
  series,
  height = '100%',
  showLegend = true,
  showTooltip = true,
  xAxisFormatter,
  xAxisAngle,
  xAxisMaxLabelLength = DEFAULT_MAX_X_AXIS_LABEL_LENGTH,
  autoRotateLongLabels = true,
  xAxisInterval,
  yAxisFormatter,
  tooltipFormatter,
  colors = defaultChartColors,
  className,
  margin,
}: BaseBarChartProps<T>) {
  const hasData = data?.length > 0;
  const maxRawLabelLength = data.reduce((maxLength, item) => {
    const value = item[xKey];
    const label = value === null || value === undefined ? '' : String(value);
    return Math.max(maxLength, label.length);
  }, 0);

  const shouldAutoRotate = autoRotateLongLabels && maxRawLabelLength > AUTO_ROTATE_LABEL_THRESHOLD;
  const effectiveXAxisAngle = typeof xAxisAngle === 'number' ? xAxisAngle : shouldAutoRotate ? -35 : 0;
  const isRotated = effectiveXAxisAngle !== 0;
  const xAxisHeight = isRotated ? 72 : 32;

  const formatXAxisLabel = (value: Numeric) => {
    const formatted = xAxisFormatter ? xAxisFormatter(value) : String(value ?? '');

    if (formatted.length <= xAxisMaxLabelLength) {
      return formatted;
    }

    if (xAxisMaxLabelLength <= 3) {
      return formatted.slice(0, xAxisMaxLabelLength);
    }

    return `${formatted.slice(0, xAxisMaxLabelLength - 3)}...`;
  };

  const defaultMargin = {
    top: 20,
    right: 20,
    left: 0,
    bottom: isRotated ? 24 : 20,
  };

  const finalMargin = { ...defaultMargin, ...margin };
  const containerStyle = {
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div className={twMerge('relative w-full', className)} style={containerStyle}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
            data={data} 
            margin={finalMargin}
        >
          <CartesianGrid {...gridStyle} />
          <XAxis
            dataKey={xKey as string}
            axisLine={axisLineStyle}
            tickLine={false}
            tick={{ ...axisTickStyle, textAnchor: isRotated ? 'end' : 'middle' }}
            tickFormatter={formatXAxisLabel}
            angle={effectiveXAxisAngle}
            height={xAxisHeight}
            interval={xAxisInterval ?? (isRotated ? 0 : 'preserveStartEnd')}
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
              cursor={{ fill: 'rgba(13, 148, 136, 0.08)' }}
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
              verticalAlign="top"
              wrapperStyle={{ paddingBottom: 12 }}
              formatter={(value) => <span style={{ color: '#000000' }}>{value}</span>}
            />
          ) : null}
          {series.map((serie, index) => (
            <Bar
              key={serie.dataKey}
              dataKey={serie.dataKey}
              name={serie.name}
              stackId={serie.stackId}
              radius={serie.radius ?? 6}
              fillOpacity={serie.fillOpacity ?? 1}
              fill={serie.color ?? colors[index % colors.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      {!hasData ? (
        <EmptyState message="Sin datos para mostrar" />
      ) : null}
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

export type { BarSeries };
export { BaseBarChart };
