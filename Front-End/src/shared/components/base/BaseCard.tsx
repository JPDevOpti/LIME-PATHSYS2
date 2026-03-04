'use client';

import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

type CardVariant = 'default' | 'muted' | 'elevated';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type BaseCardProps = {
  variant?: CardVariant;
  padding?: CardPadding;
  title?: React.ReactNode;
} & HTMLAttributes<HTMLDivElement>;

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-[var(--app-card-bg)] border border-neutral-200 shadow-elevation-sm',
  muted: 'bg-neutral-50 border border-neutral-100',
  elevated: 'bg-[var(--app-card-bg)] border border-neutral-100 shadow-elevation-md',
};

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const BaseCard = forwardRef<HTMLDivElement, BaseCardProps & { title?: React.ReactNode }>(function BaseCard(
  { variant = 'default', padding = 'md', className, title, children, ...rest },
  ref,
) {
  const rootClasses = twMerge(
    'flex flex-col rounded-xl transition-all duration-300 animate-slide-up',
    variantStyles[variant],
    // If no title, apply padding to root. If title, content handles padding.
    !title && paddingStyles[padding],
    className,
  );

  return (
    <div ref={ref} className={rootClasses} {...rest}>
      {title ? (
        <>
          <div className="border-b border-neutral-200 px-6 py-3">
            <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
          </div>
          <div className={paddingStyles[padding]}>{children}</div>
        </>
      ) : (
        children
      )}
    </div>
  );
});

export type { BaseCardProps, CardPadding, CardVariant };
export { BaseCard };
