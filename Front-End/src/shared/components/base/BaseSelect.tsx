'use client';

import type { ReactNode, SelectHTMLAttributes } from 'react';
import { forwardRef, useId } from 'react';
import { twMerge } from 'tailwind-merge';

type BaseSelectProps = {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
  leadingIcon?: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>;

const selectClasses =
  'h-11 w-full appearance-none rounded-lg border border-neutral-300 bg-white pl-4 pr-10 py-2.5 text-sm text-neutral-900 transition-all duration-200 hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-brand-500/30 focus-visible:border-lime-brand-500 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400 disabled:hover:border-neutral-300';

const ChevronDown = () => (
  <svg
    className="h-5 w-5 text-neutral-400"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M16.25 7.5L10 13.75 3.75 7.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BaseSelect = forwardRef<HTMLSelectElement, BaseSelectProps>(function BaseSelect(
  { label, helperText, error, containerClassName, leadingIcon, className, id, required, children, ...rest },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? `select-${generatedId}`;
  const helperId = helperText ? `${selectId}-helper` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = error ? errorId : helperId;

  return (
    <div className={twMerge('flex flex-col gap-1.5', containerClassName)}>
      {label ? (
        <label
          htmlFor={selectId}
          className="text-body-sm font-medium text-neutral-700"
        >
          {label}
          {required ? <span className="ml-1 text-danger-500">*</span> : null}
        </label>
      ) : null}
      <div className="relative flex items-center">
        {leadingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
            {leadingIcon}
          </span>
        ) : null}
        <select
          id={selectId}
          ref={ref}
          className={twMerge(
            selectClasses,
            leadingIcon && 'pl-10',
            error && 'border-red-500 focus-visible:ring-red-500/30 focus-visible:border-red-500 hover:border-red-500',
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown />
        </span>
      </div>
      {error ? (
        <p id={errorId} className="text-body-xs font-medium text-danger-600">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-body-xs text-neutral-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export type { BaseSelectProps };
export { BaseSelect };
