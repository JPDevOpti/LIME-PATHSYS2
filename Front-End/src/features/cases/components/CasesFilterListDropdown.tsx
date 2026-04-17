'use client';

// Lista desplegable corta (un valor) solo para prioridad y estado en la barra de filtros de casos.

import { useState, useRef, useEffect, KeyboardEvent, FocusEvent } from 'react';
import { createPortal } from 'react-dom';
import { twMerge } from 'tailwind-merge';

export interface CasesFilterListOption {
    value: string;
    label: string;
    subtitle?: string;
}

export interface CasesFilterListDropdownProps {
    value: string;
    options: CasesFilterListOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
    name?: string;
    error?: string;
    className?: string;
}

export function CasesFilterListDropdown({
    value,
    options,
    onChange,
    placeholder = 'Seleccionar...',
    disabled = false,
    id,
    name,
    error,
    className,
}: CasesFilterListDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLUListElement>(null);
    const controlId = id || name;

    const selectedOption = options.find(o => o.value === value);
    const displayText = selectedOption ? selectedOption.label : placeholder;

    useEffect(() => {
        if (!isOpen) {
            setDropdownStyle(null);
            return;
        }
        if (!containerRef.current || typeof document === 'undefined') return;

        const updatePosition = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownStyle({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
            });
        };

        updatePosition();
        const ro = new ResizeObserver(updatePosition);
        ro.observe(containerRef.current);
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            ro.disconnect();
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    useEffect(() => {
        const onDocMouseDown = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (containerRef.current?.contains(t)) return;
            if (dropdownRef.current?.contains(t)) return;
            setIsOpen(false);
            setHighlightedIndex(-1);
        };
        if (isOpen) {
            document.addEventListener('mousedown', onDocMouseDown);
            return () => document.removeEventListener('mousedown', onDocMouseDown);
        }
    }, [isOpen]);

    const openAndHighlight = (index: number) => {
        if (options.length === 0) return;
        setIsOpen(true);
        setHighlightedIndex(Math.max(0, Math.min(index, options.length - 1)));
    };

    const handleBlur = (_e: FocusEvent<HTMLButtonElement>) => {
        setTimeout(() => {
            if (dropdownRef.current?.contains(document.activeElement)) return;
            setIsOpen(false);
            setHighlightedIndex(-1);
        }, 150);
    };

    const pick = (nextValue: string) => {
        onChange(nextValue);
        setIsOpen(false);
        setHighlightedIndex(-1);
        buttonRef.current?.blur();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) {
                    openAndHighlight(0);
                } else {
                    setHighlightedIndex(i => Math.min(i + 1, options.length - 1));
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (!isOpen) {
                    openAndHighlight(options.length - 1);
                } else {
                    setHighlightedIndex(i => Math.max(i - 1, 0));
                }
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (isOpen && options.length > 0) {
                    const idx =
                        highlightedIndex >= 0 ? highlightedIndex : Math.max(0, options.findIndex(o => o.value === value));
                    const row = options[idx >= 0 ? idx : 0];
                    if (row) pick(row.value);
                } else if (!isOpen && options.length > 0) {
                    setIsOpen(true);
                    const i = options.findIndex(o => o.value === value);
                    setHighlightedIndex(i >= 0 ? i : 0);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setHighlightedIndex(-1);
                buttonRef.current?.blur();
                break;
            case 'Tab':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
            default:
                break;
        }
    };

    const listContent =
        isOpen && !disabled && dropdownStyle ? (
            <ul
                ref={dropdownRef}
                data-cases-filter-list-dropdown
                role="listbox"
                aria-labelledby={controlId}
                className="fixed z-[99999] max-h-60 overflow-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
                style={{
                    top: dropdownStyle.top,
                    left: dropdownStyle.left,
                    width: dropdownStyle.width,
                }}
                onMouseDown={e => e.preventDefault()}
            >
                {options.map((opt, idx) => (
                    <li
                        key={opt.value}
                        role="option"
                        aria-selected={opt.value === value ? 'true' : 'false'}
                        className={twMerge(
                            'cursor-pointer px-4 py-2.5 text-sm text-neutral-900 transition-colors hover:bg-neutral-50',
                            opt.value === value && 'bg-lime-brand-50 text-lime-brand-900 font-medium',
                            idx === highlightedIndex && opt.value !== value && 'bg-neutral-50'
                        )}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onClick={() => pick(opt.value)}
                    >
                        <div className="flex flex-col">
                            <span>{opt.label}</span>
                            {opt.subtitle ? (
                                <span className="text-xs font-normal text-neutral-500">{opt.subtitle}</span>
                            ) : null}
                        </div>
                    </li>
                ))}
            </ul>
        ) : null;

    return (
        <div ref={containerRef} className={twMerge('relative', className)}>
            <button
                ref={buttonRef}
                type="button"
                id={controlId}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen ? 'true' : 'false'}
                onClick={() => {
                    if (disabled || options.length === 0) return;
                    setIsOpen(o => {
                        if (o) {
                            setHighlightedIndex(-1);
                            return false;
                        }
                        const i = options.findIndex(x => x.value === value);
                        setHighlightedIndex(i >= 0 ? i : 0);
                        return true;
                    });
                }}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={twMerge(
                    'flex h-10 w-full items-center justify-between rounded-md border border-neutral-300 bg-white py-2 pl-3 pr-10 text-left text-sm text-neutral-900',
                    'transition-all duration-200',
                    'hover:border-neutral-400',
                    'focus:outline-none focus:ring-2 focus:ring-lime-brand-500/30 focus:border-lime-brand-500',
                    'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-neutral-300',
                    !selectedOption && 'text-neutral-400',
                    error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30 hover:border-red-500'
                )}
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
                    aria-hidden
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {typeof document !== 'undefined' && listContent && createPortal(listContent, document.body)}
            {name ? <input type="hidden" name={name} value={value} readOnly /> : null}
        </div>
    );
}
