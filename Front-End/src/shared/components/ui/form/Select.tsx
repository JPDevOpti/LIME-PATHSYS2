'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
    value: string | number;
    label: string;
    subtitle?: string;
}

interface SelectProps {
    value?: string | number;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onBlur?: (e: React.FocusEvent) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    id?: string;
    name?: string;
    className?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, error, id, name, options, placeholder, value = '', onChange, onBlur, disabled }, ref) => {
        const [isOpen, setIsOpen] = useState(false);
        const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const selectId = id || name;

        const selectedOption = options.find((opt) => String(opt.value) === String(value));
        const displayText = selectedOption ? selectedOption.label : placeholder || '';

        const updateDropdownPosition = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDropdownStyle({
                    top: rect.bottom + 4,
                    left: rect.left,
                    width: rect.width
                });
            }
        };

        useEffect(() => {
            if (isOpen && containerRef.current && typeof document !== 'undefined') {
                updateDropdownPosition();
                const resizeObserver = new ResizeObserver(updateDropdownPosition);
                resizeObserver.observe(containerRef.current);
                window.addEventListener('scroll', updateDropdownPosition, true);
                window.addEventListener('resize', updateDropdownPosition);
                return () => {
                    resizeObserver.disconnect();
                    window.removeEventListener('scroll', updateDropdownPosition, true);
                    window.removeEventListener('resize', updateDropdownPosition);
                };
            } else {
                setDropdownStyle(null);
            }
        }, [isOpen]);

        useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => {
                const target = e.target as HTMLElement;
                const isInsideTrigger = containerRef.current?.contains(target);
                const isInsideDropdown = target.closest('[data-select-dropdown]');
                if (!isInsideTrigger && !isInsideDropdown) {
                    setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const handleSelect = (opt: { value: string | number; label: string }) => {
            const syntheticEvent = {
                target: { value: String(opt.value), name: name || '' },
            } as React.ChangeEvent<HTMLSelectElement>;
            onChange?.(syntheticEvent);
            setIsOpen(false);
        };

        useImperativeHandle(ref, () => ({} as HTMLSelectElement));

        const dropdownContent = isOpen && !disabled && dropdownStyle && (
            <ul
                data-select-dropdown
                role="listbox"
                className="fixed max-h-60 overflow-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg z-[99999]"
                style={{
                    top: dropdownStyle.top,
                    left: dropdownStyle.left,
                    width: dropdownStyle.width
                }}
            >
                {options.map((opt) => (
                    <li
                        key={opt.value}
                        role="option"
                        aria-selected={String(opt.value) === String(value)}
                        className={twMerge(
                            'cursor-pointer px-4 py-2.5 text-sm text-neutral-900 transition-colors hover:bg-neutral-50',
                            String(opt.value) === String(value) && 'bg-lime-brand-50 text-lime-brand-900 font-medium'
                        )}
                        onClick={() => handleSelect(opt)}
                    >
                        <div className="flex flex-col">
                            <span>{opt.label}</span>
                            {opt.subtitle && (
                                <span className="text-xs text-neutral-500 font-normal">{opt.subtitle}</span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        );

        return (
            <div ref={containerRef} className="relative">
                <button
                    type="button"
                    id={selectId}
                    disabled={disabled}
                    onClick={() => !disabled && setIsOpen((o) => !o)}
                    onBlur={onBlur}
                    className={twMerge(
                        'flex h-10 w-full items-center justify-between rounded-md border border-neutral-300 bg-white pl-3 pr-10 py-2 text-left text-sm text-neutral-900',
                        'transition-all duration-200',
                        'hover:border-neutral-400',
                        'focus:outline-none focus:ring-2 focus:ring-lime-brand-500/30 focus:border-lime-brand-500',
                        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-neutral-300',
                        !selectedOption && 'text-neutral-400',
                        error && 'border-red-500 focus:ring-red-500/30 focus:border-red-500 hover:border-red-500',
                        className
                    )}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                >
                    <span className="truncate">{displayText}</span>
                </button>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg
                        className={twMerge('h-5 w-5 text-neutral-500 transition-transform', isOpen && 'rotate-180')}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                {typeof document !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}

                {name && (
                    <input type="hidden" name={name} value={value} readOnly />
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';
