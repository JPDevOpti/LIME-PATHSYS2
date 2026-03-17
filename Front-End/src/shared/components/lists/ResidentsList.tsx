'use client';

import { useEffect, useState } from 'react';
import { Combobox } from '@/shared/components/ui/form/Combobox';
import type { ComboboxOption } from '@/shared/components/ui/form/Combobox';
import { residentService } from '@/features/results/services/resident.service';

function getInitials(name: string): string {
    return (name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 6);
}

interface ResidentsComboboxProps {
    value: string;
    onChange: (value: string) => void;
    onResidentSelected?: (id: string, name: string) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    name?: string;
    id?: string;
    required?: boolean;
    options?: ComboboxOption[];
}

export function ResidentsCombobox({
    value,
    onChange,
    onResidentSelected,
    onBlur,
    placeholder = 'Buscar residente...',
    disabled = false,
    error,
    name,
    id,
    required,
    options: optionsProp
}: ResidentsComboboxProps) {
    const [apiOptions, setApiOptions] = useState<ComboboxOption[]>([]);
    const [loading, setLoading] = useState(!optionsProp);

    useEffect(() => {
        if (optionsProp) return;
        let cancelled = false;
        residentService
            .listResidents(undefined, false)
            .then((residents) => {
                if (cancelled) return;
                setApiOptions(
                    residents.map((p) => ({
                        value: p.id,
                        label: p.name,
                        subtitle: (p.initials || getInitials(p.name)) || undefined,
                    }))
                );
            })
            .catch(() => {
                if (cancelled) return;
                setApiOptions([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [optionsProp]);

    const options = optionsProp ?? apiOptions;

    const handleChange = (newValue: string) => {
        onChange(newValue);
        const opt = options.find((o) => o.value === newValue);
        if (opt && onResidentSelected) {
            onResidentSelected(opt.value, opt.label);
        }
    };

    return (
        <Combobox
            value={value}
            onChange={handleChange}
            onBlur={onBlur}
            options={options}
            placeholder={loading ? 'Cargando residentes...' : placeholder}
            disabled={disabled || loading}
            error={error}
            name={name}
            id={id}
            required={required}
        />
    );
}
