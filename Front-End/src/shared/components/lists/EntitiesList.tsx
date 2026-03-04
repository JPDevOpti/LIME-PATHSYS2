'use client';

import { useEffect, useState } from 'react';
import { Combobox } from '@/shared/components/ui/form/Combobox';
import { entitiesService } from '@/features/entities-management/services/entities.service';
import type { ComboboxOption } from '@/shared/components/ui/form/Combobox';

interface EntitiesComboboxProps {
    value: string;
    onChange: (value: string) => void;
    onEntitySelected?: (code: string, name: string) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    name?: string;
    required?: boolean;
}

export function EntitiesCombobox({
    value,
    onChange,
    onEntitySelected,
    onBlur,
    placeholder = 'Buscar y seleccionar entidad...',
    disabled = false,
    error,
    name,
    required
}: EntitiesComboboxProps) {
    const [options, setOptions] = useState<ComboboxOption[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        entitiesService
            .getAll(true)
            .then((entities) => {
                if (cancelled) return;
                setOptions(
                    entities.map((e) => ({
                        value: e.code,
                        label: e.name,
                        subtitle: e.code
                    }))
                );
            })
            .catch(() => {
                if (cancelled) return;
                setOptions([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleChange = (newValue: string) => {
        onChange(newValue);
        const opt = options.find((o) => o.value === newValue);
        if (opt && onEntitySelected) onEntitySelected(opt.value, opt.label);
    };

    // Permite controlar el componente con código (value) o nombre (label)
    const normalizedValue = options.find((o) => o.value === value || o.label === value)?.value || value;

    return (
        <div className="relative">
            <Combobox
                value={normalizedValue}
                onChange={handleChange}
                onBlur={onBlur}
                options={options}
                placeholder={loading ? 'Cargando entidades...' : placeholder}
                disabled={disabled || loading}
                error={error}
                name={name}
                required={required}
            />
        </div>
    );
}
