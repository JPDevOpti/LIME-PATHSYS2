'use client';

import { useEffect, useMemo, useState } from 'react';
import { Combobox } from '@/shared/components/ui/form/Combobox';
import { BODY_REGION_OPTIONS } from '@/shared/data/mock-body-regions';
import type { ComboboxOption } from '@/shared/components/ui/form/Combobox';
import { Input } from '@/shared/components/ui/form';

interface BodyRegionComboboxProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    name?: string;
    required?: boolean;
}

export function BodyRegionCombobox({
    value,
    onChange,
    onBlur,
    placeholder = 'Buscar region del cuerpo...',
    disabled = false,
    error,
    name,
    required
}: BodyRegionComboboxProps) {
    const options: ComboboxOption[] = useMemo(
        () => BODY_REGION_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
        []
    );

    const [selectedOptionValue, setSelectedOptionValue] = useState('');
    const [customValue, setCustomValue] = useState('');

    useEffect(() => {
        if (!value) {
            setSelectedOptionValue('');
            setCustomValue('');
            return;
        }

        const isKnownOption = options.some((o) => o.value === value && o.value !== 'otro');

        if (isKnownOption) {
            setSelectedOptionValue(value);
            setCustomValue('');
        } else {
            setSelectedOptionValue('otro');
            setCustomValue(value);
        }
    }, [value, options]);

    const isOtherSelected = selectedOptionValue === 'otro';

    const handleSelectExisting = (nextValue: string) => {
        setSelectedOptionValue(nextValue);

        if (nextValue === 'otro') {
            setCustomValue('');
            onChange('');
            return;
        }

        setCustomValue('');
        onChange(nextValue);
    };

    const handleAddOther = (query: string) => {
        setSelectedOptionValue('otro');
        setCustomValue(query);
        onChange(query);
    };

    const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        setCustomValue(next);
        onChange(next);
    };

    return (
        <div className="flex flex-col md:flex-row md:items-start gap-2">
            <div className={isOtherSelected ? 'w-full md:flex-1' : 'w-full'}>
                <Combobox
                    value={selectedOptionValue}
                    onChange={handleSelectExisting}
                    onBlur={onBlur}
                    options={options}
                    placeholder={placeholder}
                    disabled={disabled}
                    error={error}
                    name={name}
                    required={required}
                    noResultsActionLabel="Agregar otro (especificar)"
                    onNoResultsAction={handleAddOther}
                    accentInsensitiveSearch
                />
            </div>

            {isOtherSelected && (
                <Input
                    type="text"
                    value={customValue}
                    onChange={handleCustomInputChange}
                    placeholder="Escriba otra región del cuerpo"
                    disabled={disabled}
                    className="w-full md:flex-1"
                />
            )}
        </div>
    );
}
