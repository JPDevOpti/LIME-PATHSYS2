'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useId } from 'react';
import { twMerge } from 'tailwind-merge';

type BaseCheckboxProps = {
  label?: ReactNode;
  description?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const checkboxClasses =
  'h-4 w-4 shrink-0 rounded border border-neutral-300 text-lime-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-blue-200 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100';

const BaseCheckbox = forwardRef<HTMLInputElement, BaseCheckboxProps>(function BaseCheckbox(
  {
    label,
    description,
    helperText,
    error,
    containerClassName,
    className,
    id,
    required,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const checkboxId = id ?? `checkbox-${generatedId}`;
  const helperId = helperText ? `${checkboxId}-helper` : undefined;
  const errorId = error ? `${checkboxId}-error` : undefined;
  const describedBy = error ? errorId : helperId;

  return (
    <div className={twMerge('flex flex-col gap-1.5', containerClassName)}>
      <label htmlFor={checkboxId} className="inline-flex items-start gap-3">
        <input
          id={checkboxId}
          ref={ref}
          type="checkbox"
          className={twMerge(
            checkboxClasses,
            error && 'border-danger-300 focus-visible:outline-danger-400',
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        />
        <span className="flex flex-col gap-0.5">
          {label ? (
            <span className="text-body-sm font-medium text-neutral-700">
              {label}
              {required ? <span className="ml-1 text-danger-500">*</span> : null}
            </span>
          ) : null}
          {description ? (
            <span className="text-body-xs text-neutral-500">{description}</span>
          ) : null}
        </span>
      </label>
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

export type { BaseCheckboxProps };
export { BaseCheckbox };
