'use client';

import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useId } from 'react';
import { twMerge } from 'tailwind-merge';

type ComboboxOption = {
  value: string;
  label?: string;
};

type BaseComboboxProps = {
  label?: ReactNode;
  helperText?: ReactNode;
  error?: ReactNode;
  options?: ComboboxOption[];
  containerClassName?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'list'>;

const inputClasses =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-body-md text-neutral-900 placeholder:text-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-blue-200 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400';

const BaseCombobox = forwardRef<HTMLInputElement, BaseComboboxProps>(function BaseCombobox(
  {
    label,
    helperText,
    error,
    options = [],
    containerClassName,
    leadingIcon,
    trailingIcon,
    className,
    id,
    required,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? `combobox-${generatedId}`;
  const datalistId = `${inputId}-options`;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = error ? errorId : helperId;

  return (
    <div className={twMerge('flex flex-col gap-1.5', containerClassName)}>
      {label ? (
        <label
          htmlFor={inputId}
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
        <input
          id={inputId}
          ref={ref}
          list={options.length ? datalistId : undefined}
          className={twMerge(
            inputClasses,
            leadingIcon && 'pl-10',
            trailingIcon && 'pr-10',
            error && 'border-danger-300 focus-visible:outline-danger-400',
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          autoComplete="off"
          required={required}
          {...rest}
        />
        {trailingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400">
            {trailingIcon}
          </span>
        ) : null}
        {options.length ? (
          <datalist id={datalistId}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </datalist>
        ) : null}
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

export type { BaseComboboxProps, ComboboxOption };
export { BaseCombobox };
