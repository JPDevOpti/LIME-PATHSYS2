'use client';

// Solo para la barra de filtros de casos (multi + fila "Todos"). El resto del app usa `Combobox` (selección única).

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { twMerge } from 'tailwind-merge';

export interface TodosMultiOption {
    value: string;
    label: string;
    subtitle?: string;
}

function normalizeForSearch(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export interface TodosMultiComboboxProps {
    options: TodosMultiOption[];
    /** Si true, no se aplica filtro por estas opciones (equivalente a todas incluidas). */
    allMode: boolean;
    /** Valores marcados cuando `allMode` es false (subconjunto). */
    selectedValues: Set<string>;
    onChange: (next: { allMode: boolean; selectedValues: Set<string> }) => void;
    placeholder?: string;
    disabled?: boolean;
    todosLabel?: string;
    accentInsensitiveSearch?: boolean;
    name?: string;
    id?: string;
    error?: string;
}

export function TodosMultiCombobox({
    options,
    allMode,
    selectedValues,
    onChange,
    placeholder = 'Seleccionar...',
    disabled = false,
    todosLabel = 'Todos',
    accentInsensitiveSearch = false,
    name,
    id,
    error,
}: TodosMultiComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const allValueKeys = options.map(o => o.value);

    const updateDropdownPosition = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownStyle({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
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

    const queryTrimmed = searchQuery.trim();
    const filteredOptions = queryTrimmed
        ? options.filter(option => {
              if (accentInsensitiveSearch) {
                  const needle = normalizeForSearch(queryTrimmed);
                  const labelHay = normalizeForSearch(option.label);
                  const subHay = option.subtitle ? normalizeForSearch(option.subtitle) : '';
                  return labelHay.includes(needle) || (option.subtitle ? subHay.includes(needle) : false);
              }
              const q = queryTrimmed.toLowerCase();
              return (
                  option.label.toLowerCase().includes(q) ||
                  (option.subtitle?.toLowerCase().includes(q) ?? false)
              );
          })
        : options;

    const rowCount = 1 + filteredOptions.length;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const isInsideTrigger = containerRef.current?.contains(target);
            const isInsideDropdown = target.closest('[data-todos-multicombo-dropdown]');
            if (!isInsideTrigger && !isInsideDropdown) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const summaryText = (() => {
        if (allMode) return todosLabel;
        if (selectedValues.size === 0) return 'Sin selección';
        if (selectedValues.size === 1) {
            const v = [...selectedValues][0];
            return options.find(o => o.value === v)?.label ?? v;
        }
        return `${selectedValues.size} seleccionados`;
    })();

    const displayText = isFocused ? searchQuery : summaryText;

    const handleFocus = () => {
        setIsFocused(true);
        setSearchQuery('');
        setIsOpen(true);
        setHighlightedIndex(-1);
    };

    const handleBlur = () => {
        setTimeout(() => {
            setIsFocused(false);
            if (dropdownRef.current?.contains(document.activeElement)) {
                return;
            }
            setIsOpen(false);
        }, 150);
    };

    const toggleTodos = () => {
        if (allMode) {
            onChange({ allMode: false, selectedValues: new Set() });
        } else {
            onChange({ allMode: true, selectedValues: new Set() });
        }
    };

    const toggleOption = (value: string) => {
        if (allMode) {
            const next = new Set(allValueKeys.filter(k => k !== value));
            onChange({ allMode: false, selectedValues: next });
        } else {
            const next = new Set(selectedValues);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            onChange({ allMode: false, selectedValues: next });
        }
    };

    const rowCheckedTodos = allMode;
    const rowCheckedOption = (value: string) => allMode || selectedValues.has(value);

    const dropdownContent = isOpen && !disabled && dropdownStyle && (
        <div
            ref={dropdownRef}
            data-todos-multicombo-dropdown
            className="fixed z-[99999] max-h-60 overflow-y-auto rounded-lg border border-neutral-300 bg-white shadow-lg"
            style={{
                top: dropdownStyle.top,
                left: dropdownStyle.left,
                width: dropdownStyle.width,
            }}
            onMouseDown={e => e.preventDefault()}
        >
            <>
                <div
                    className={twMerge(
                        'flex cursor-pointer items-start gap-2 border-b border-neutral-100 px-2 py-2 text-sm transition-colors',
                        highlightedIndex === 0 ? 'bg-lime-brand-50' : 'hover:bg-neutral-50'
                    )}
                    onMouseEnter={() => setHighlightedIndex(0)}
                    onClick={e => {
                        e.preventDefault();
                        toggleTodos();
                    }}
                >
                    <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-300 text-lime-brand-600 focus:ring-lime-brand-500"
                        checked={rowCheckedTodos}
                        onChange={() => {}}
                        onMouseDown={e => e.preventDefault()}
                        onClick={e => {
                            e.stopPropagation();
                            toggleTodos();
                        }}
                        tabIndex={-1}
                        aria-label={todosLabel}
                    />
                    <span className="font-medium text-neutral-900">{todosLabel}</span>
                </div>
                {options.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-neutral-500">No hay opciones</div>
                ) : filteredOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-neutral-500">No se encontraron resultados</div>
                ) : (
                    filteredOptions.map((option, i) => {
                        const idx = i + 1;
                        const checked = rowCheckedOption(option.value);
                        return (
                            <div
                                key={option.value}
                                className={twMerge(
                                    'flex cursor-pointer items-start gap-2 px-2 py-2 text-sm transition-colors',
                                    highlightedIndex === idx ? 'bg-lime-brand-50' : 'hover:bg-neutral-50',
                                    checked && !allMode && 'bg-lime-brand-50/50'
                                )}
                                onMouseEnter={() => setHighlightedIndex(idx)}
                                onClick={e => {
                                    e.preventDefault();
                                    toggleOption(option.value);
                                }}
                            >
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-300 text-lime-brand-600 focus:ring-lime-brand-500"
                                    checked={checked}
                                    onChange={() => {}}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={e => {
                                        e.stopPropagation();
                                        toggleOption(option.value);
                                    }}
                                    tabIndex={-1}
                                    aria-label={option.label}
                                />
                                <div className="min-w-0 flex-1">
                                    <span>{option.label}</span>
                                    {option.subtitle ? (
                                        <span className="block text-xs text-neutral-500">{option.subtitle}</span>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })
                )}
            </>
        </div>
    );

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (!isOpen) setIsOpen(true);
                setHighlightedIndex(prev => Math.min(prev + 1, Math.max(0, rowCount - 1)));
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (isOpen) setHighlightedIndex(prev => Math.max(prev - 1, 0));
                break;
            case 'Escape':
                event.preventDefault();
                setIsOpen(false);
                inputRef.current?.blur();
                break;
            case 'Tab':
                setIsOpen(false);
                break;
            default:
                break;
        }
    };

    return (
        <div ref={containerRef} className="relative w-full min-w-0">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    id={id || name}
                    name={name}
                    value={displayText}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={twMerge(
                        'flex h-10 w-full min-w-0 rounded-md border bg-white px-3 py-2 pr-10 text-sm placeholder:text-neutral-400 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-lime-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
                        error ? 'border-red-500 focus:ring-red-500' : 'border-neutral-300'
                    )}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onChange={e => setSearchQuery(e.target.value)}
                    autoComplete="off"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg
                        className={twMerge('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180 transform')}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            {typeof document !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
        </div>
    );
}
