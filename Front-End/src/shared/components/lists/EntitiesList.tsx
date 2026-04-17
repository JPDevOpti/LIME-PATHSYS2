'use client';

import { useEffect, useState } from 'react';
import { Combobox } from '@/shared/components/ui/form/Combobox';
import { entitiesService } from '@/features/entities-management/services/entities.service';
import type { ComboboxOption } from '@/shared/components/ui/form/Combobox';

interface EntitiesComboboxProps {
    value: string;
    onChange: (value: string) => void;
    onEntitySelected?: (code: string, name: string, id: string) => void;
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
    required,
}: EntitiesComboboxProps) {
    const [options, setOptions] = useState<ComboboxOption[]>([]);
    const [entityIdMap, setEntityIdMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        entitiesService
            .getAll(false)
            .then((entities) => {
                if (cancelled) return;
                const active = entities.filter((e) => e.is_active !== false);
                setOptions(
                    active.map((e) => ({
                        value: e.code,
                        label: e.name,
                        subtitle: e.code
                    }))
                );
                const idMap: Record<string, string> = {};
                for (const e of active) {
                    idMap[e.code] = e.id;
                }
                setEntityIdMap(idMap);
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
        if (opt && onEntitySelected) onEntitySelected(opt.value, opt.label, entityIdMap[opt.value] || '');
    };

    const normalizedValue = (() => {
        if (!value) return '';
        const v = value.trim().toLowerCase();
        return options.find(
            (o) => o.value.toLowerCase() === v || o.label.toLowerCase() === v
        )?.value || value;
    })();

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
