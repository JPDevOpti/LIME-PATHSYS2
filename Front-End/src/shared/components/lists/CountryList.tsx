'use client';

import { Combobox } from '@/shared/components/ui/form/Combobox';
import { COUNTRY_OPTIONS } from '@/shared/data/mock-countries';
import type { ComboboxOption } from '@/shared/components/ui/form/Combobox';

interface CountryComboboxProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    name?: string;
    required?: boolean;
}

export function CountryCombobox({
    value,
    onChange,
    onBlur,
    placeholder = 'Buscar país...',
    disabled = false,
    error,
    name,
    required
}: CountryComboboxProps) {
    const options: ComboboxOption[] = COUNTRY_OPTIONS.map((c) => ({ value: c.label, label: c.label }));
    return (
        <Combobox
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            options={options}
            placeholder={placeholder}
            disabled={disabled}
            error={error}
            name={name}
            required={required}
        />
    );
}
