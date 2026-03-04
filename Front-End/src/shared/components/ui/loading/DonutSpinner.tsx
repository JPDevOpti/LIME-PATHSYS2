'use client';

import { BaseCard } from '@/shared/components/base/BaseCard';

type DonutSpinnerProps = {
  /** Tamaño del donut: sm, md, lg */
  size?: 'sm' | 'md' | 'lg';
  /** Si true, envuelve en BaseCard con altura mínima para contenedores de dashboard */
  wrapped?: boolean;
  /** Altura mínima cuando wrapped (ej: 'h-32', 'min-h-[250px]') */
  minHeight?: string;
};

const sizeClasses = {
  sm: 'h-8 w-8 border-2',
  md: 'h-12 w-12 border-[3px]',
  lg: 'h-16 w-16 border-4',
};

export function DonutSpinner({ size = 'md', wrapped = false, minHeight = 'min-h-[200px]' }: DonutSpinnerProps) {
  const donut = (
    <div
      className={`rounded-full border-neutral-200 border-t-lime-brand-600 animate-spin ${sizeClasses[size]}`}
      role="status"
      aria-label="Cargando"
    />
  );

  if (wrapped) {
    return (
      <BaseCard
        className={`flex flex-col items-center justify-center gap-4 ${minHeight}`}
        variant="default"
        padding="lg"
      >
        {donut}
        <span className="text-sm text-neutral-500">Cargando...</span>
      </BaseCard>
    );
  }

  return donut;
}

export type { DonutSpinnerProps };
