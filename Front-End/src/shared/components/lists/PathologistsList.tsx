'use client';

import { useEffect, useState } from 'react';
import { Combobox } from '@/shared/components/ui/form/Combobox';
import type { ComboboxOption } from '@/shared/components/ui/form/Combobox';
import { pathologistService } from '@/features/results/services/pathologist.service';

function getInitials(name: string): string {
    return (name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 6);
}

interface PathologistsComboboxProps {
    value: string;
    onChange: (value: string) => void;
    onPathologistSelected?: (id: string, name: string) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    name?: string;
    id?: string;
    required?: boolean;
    options?: ComboboxOption[];
}

export function PathologistsCombobox({
    value,
    onChange,
    onPathologistSelected,
    onBlur,
    placeholder = 'Buscar patologo...',
    disabled = false,
    error,
    name,
    id,
    required,
    options: optionsProp
}: PathologistsComboboxProps) {
    const [apiOptions, setApiOptions] = useState<ComboboxOption[]>([]);
    const [loading, setLoading] = useState(!optionsProp);

    useEffect(() => {
        if (optionsProp) return;
        let cancelled = false;
        pathologistService
            .listPathologists(undefined, false)
            .then((pathologists) => {
                if (cancelled) return;
                setApiOptions(
                    pathologists.map((p) => ({
                        value: p.id,
                        label: p.name,
                        subtitle: getInitials(p.name) || undefined,
                    }))
                );
            })
            .catch((err) => {
                if (cancelled) return;
                console.error('Error loading pathologists:', err);
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
        if (opt && onPathologistSelected) {
            onPathologistSelected(opt.value, opt.label);
        }
    };

    return (
        <Combobox
            value={value}
            onChange={handleChange}
            onBlur={onBlur}
            options={options}
            placeholder={loading ? 'Cargando patólogos...' : placeholder}
            disabled={disabled || loading}
            error={error}
            name={name}
            id={id}
            required={required}
        />
    );
}
