'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type BaseButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  loading?: boolean;
  block?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-lime-brand-600 text-white shadow-elevation-sm hover:bg-lime-brand-700 focus-visible:outline-lime-blue-200',
  secondary:
    'border border-lime-brand-200 bg-white text-lime-brand-700 hover:bg-lime-brand-50 focus-visible:outline-lime-blue-200',
  tertiary:
    'border border-transparent bg-lime-brand-50 text-lime-brand-700 hover:bg-lime-brand-100 focus-visible:outline-lime-blue-200',
  danger:
    'bg-danger-600 text-white shadow-elevation-sm hover:bg-danger-700 focus-visible:outline-danger-300',
  ghost:
    'border border-transparent bg-transparent text-neutral-700 hover:bg-neutral-100 focus-visible:outline-neutral-300',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-body-sm',
  md: 'h-11 px-4 text-body-md',
  lg: 'h-12 px-6 text-body-md',
};

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin"
    viewBox="0 0 24 24"
    role="status"
    aria-label="Cargando"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      fill="none"
    />
    <path
      className="opacity-75"
      d="M4 12a8 8 0 018-8"
      fill="currentColor"
    />
  </svg>
);

const BaseButton = forwardRef<HTMLButtonElement, BaseButtonProps>(function BaseButton(
  {
    variant = 'primary',
    size = 'md',
    startIcon,
    endIcon,
    loading = false,
    className,
    block = false,
    disabled,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      className={twMerge(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        sizeStyles[size],
        variantStyles[variant],
        block && 'w-full',
        className,
      )}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <Spinner />
      ) : startIcon ? (
        <span className="inline-flex items-center" aria-hidden="true">
          {startIcon}
        </span>
      ) : null}
      <span className={clsx('inline-flex items-center', loading && 'opacity-80')}>
        {children}
      </span>
      {!loading && endIcon ? (
        <span className="inline-flex items-center" aria-hidden="true">
          {endIcon}
        </span>
      ) : null}
    </button>
  );
});

export type { BaseButtonProps, ButtonSize, ButtonVariant };
export { BaseButton };
