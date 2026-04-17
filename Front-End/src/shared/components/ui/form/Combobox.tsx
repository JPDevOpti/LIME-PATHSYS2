'use client';

// Selección única con listado en portal; el multi de filtros de casos vive en `features/cases/TodosMultiCombobox`.

import { useState, useRef, useEffect, KeyboardEvent, FocusEvent } from 'react';
import { createPortal } from 'react-dom';
import { twMerge } from 'tailwind-merge';

export interface ComboboxOption {
    value: string;
    label: string;
    subtitle?: string;
}

/** Quita tildes y pasa a minúsculas para comparar búsqueda vs etiquetas. */
function normalizeForSearch(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

interface ComboboxProps {
    value?: string;
    onChange: (value: string) => void;
    onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
    options: ComboboxOption[];
    placeholder?: string;
    disabled?: boolean;
    name?: string;
    id?: string;
    error?: string;
    required?: boolean;
    noResultsActionLabel?: string;
    onNoResultsAction?: (searchQuery: string) => void;
    /** Si true, la búsqueda ignora tildes (ej. "torax" encuentra "Tórax"). */
    accentInsensitiveSearch?: boolean;
}

export function Combobox({
    value = '',
    onChange,
    onBlur,
    options,
    placeholder = 'Buscar...',
    disabled = false,
    name,
    id,
    error,
    required,
    noResultsActionLabel,
    onNoResultsAction,
    accentInsensitiveSearch = false,
}: ComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

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
                  return (
                      labelHay.includes(needle) ||
                      (option.subtitle ? subHay.includes(needle) : false)
                  );
              }
              const q = queryTrimmed.toLowerCase();
              return (
                  option.label.toLowerCase().includes(q) ||
                  (option.subtitle?.toLowerCase().includes(q) ?? false)
              );
          })
        : options;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const isInsideTrigger = containerRef.current?.contains(target);
            const isInsideDropdown = target.closest('[data-combobox-dropdown]');
            if (!isInsideTrigger && !isInsideDropdown) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);
    const displayText = isFocused ? searchQuery : selectedOption?.label || '';

    const handleFocus = () => {
        setIsFocused(true);
        setSearchQuery('');
        setIsOpen(true);
        setHighlightedIndex(-1);
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
        setTimeout(() => {
            setIsFocused(false);
            if (dropdownRef.current?.contains(document.activeElement)) {
                return;
            }
            setIsOpen(false);
            if (!value) {
                setSearchQuery('');
            }
        }, 150);

        if (onBlur) {
            onBlur(e);
        }
    };

    const selectOption = (option: ComboboxOption) => {
        onChange(option.value);
        setSearchQuery('');
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                }
                setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
                break;

            case 'ArrowUp':
                event.preventDefault();
                if (isOpen) {
                    setHighlightedIndex(prev => Math.max(prev - 1, -1));
                }
                break;

            case 'Enter':
                event.preventDefault();
                if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                    selectOption(filteredOptions[highlightedIndex]);
                }
                break;

            case 'Escape':
                event.preventDefault();
                setIsOpen(false);
                setHighlightedIndex(-1);
                inputRef.current?.blur();
                break;

            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    const dropdownContent = isOpen && !disabled && dropdownStyle && (
        <div
            ref={dropdownRef}
            data-combobox-dropdown
            className="fixed z-[99999] max-h-60 overflow-y-auto rounded-lg border border-neutral-300 bg-white shadow-lg"
            style={{
                top: dropdownStyle.top,
                left: dropdownStyle.left,
                width: dropdownStyle.width,
            }}
            onMouseDown={e => e.preventDefault()}
        >
            {filteredOptions.length === 0 ? (
                <div className="py-1">
                    <div className="px-3 py-2 text-center text-sm text-neutral-500">
                        {searchQuery.trim() ? 'No se encontraron resultados' : 'No hay opciones disponibles'}
                    </div>
                    {searchQuery.trim() && onNoResultsAction && (
                        <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm text-lime-brand-700 transition-colors hover:bg-lime-brand-50"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                                onNoResultsAction(searchQuery.trim());
                                setIsOpen(false);
                                setHighlightedIndex(-1);
                                inputRef.current?.blur();
                            }}
                        >
                            {noResultsActionLabel || 'Agregar otro'}
                        </button>
                    )}
                </div>
            ) : (
                filteredOptions.map((option, index) => (
                    <div
                        key={option.value}
                        className={twMerge(
                            'cursor-pointer px-3 py-2 text-sm transition-colors',
                            index === highlightedIndex
                                ? 'bg-lime-brand-50 text-lime-brand-900'
                                : 'text-neutral-900 hover:bg-neutral-50',
                            value === option.value && 'bg-lime-brand-100 font-medium text-lime-brand-900'
                        )}
                        onClick={() => selectOption(option)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-col">
                                <span>{option.label}</span>
                                {option.subtitle && (
                                    <span className="text-xs font-normal text-neutral-500">{option.subtitle}</span>
                                )}
                            </div>
                            {value === option.value && (
                                <svg
                                    className="h-4 w-4 shrink-0 text-lime-brand-600"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );

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
                    required={required}
                    className={twMerge(
                        'flex h-10 w-full min-w-0 rounded-md border bg-white px-3 py-2 pr-10 text-sm transition-all duration-200 placeholder:text-neutral-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-lime-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
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
