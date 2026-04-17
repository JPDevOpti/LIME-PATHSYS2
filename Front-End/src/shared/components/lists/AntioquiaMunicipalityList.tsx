'use client';

import { Combobox } from '@/shared/components/ui/form/Combobox';
import { ANTIOQUIA_MUNICIPALITY_OPTIONS } from '@/shared/data/mock-antioquia-municipalities';
import type { ComboboxOption } from '@/shared/components/ui/form/Combobox';

interface AntioquiaMunicipalityComboboxProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    name?: string;
    required?: boolean;
    includeAntioquiaOption?: boolean;
}

export function AntioquiaMunicipalityCombobox({
    value,
    onChange,
    onBlur,
    placeholder = 'Buscar municipio...',
    disabled = false,
    error,
    name,
    required,
    includeAntioquiaOption = false
}: AntioquiaMunicipalityComboboxProps) {
    const options: ComboboxOption[] = [
        ...(includeAntioquiaOption ? [{ value: 'Antioquia', label: 'Antioquia' }] : []),
        ...ANTIOQUIA_MUNICIPALITY_OPTIONS.map((m) => ({ value: m.label, label: m.label }))
    ];

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
