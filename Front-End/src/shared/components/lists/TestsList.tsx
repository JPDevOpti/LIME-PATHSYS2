'use client';

import { useEffect, useMemo, useState } from 'react';
import { Combobox } from '@/shared/components/ui/form/Combobox';
import { labTestsService } from '@/features/test-management/services/lab-tests.service';
import type { ComboboxOption } from '@/shared/components/ui/form/Combobox';
import { Input } from '@/shared/components/ui/form';

interface TestsComboboxProps {
    value: string;
    onChange: (value: string) => void;
    onTestSelected?: (code: string, name: string, time?: number) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    name?: string;
    required?: boolean;
    /** Opciones adicionales (ej. pruebas cargadas del caso que no estan en la API) */
    extraOptions?: { code: string; name: string }[];
}

export function TestsCombobox({
    value,
    onChange,
    onTestSelected,
    onBlur,
    placeholder = 'Buscar y seleccionar prueba...',
    disabled = false,
    error,
    name,
    required,
    extraOptions = []
}: TestsComboboxProps) {
    const [apiOptions, setApiOptions] = useState<ComboboxOption[]>([]);
    const [allTests, setAllTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOptionValue, setSelectedOptionValue] = useState('');
    const [customValue, setCustomValue] = useState('');

    useEffect(() => {
        let cancelled = false;
        labTestsService
            .getAll(true)
            .then((tests) => {
                if (cancelled) return;
                setApiOptions(
                    tests.map((t) => ({
                        value: t.test_code,
                        label: t.name,
                        subtitle: t.test_code
                    }))
                );
                setAllTests(tests);
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
    }, []);

    const options = useMemo(() => {
        const base = apiOptions;
        const extra = (extraOptions || [])
            .filter((e) => e.code?.trim() && !base.some((o) => o.value === e.code))
            .map((e) => ({ value: e.code, label: e.name, subtitle: e.code }));
        return [...extra, ...base];
    }, [apiOptions, extraOptions]);

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

    const handleChange = (newValue: string) => {
        setSelectedOptionValue(newValue);

        if (newValue === 'otro') {
            setCustomValue('');
            onChange('');
            if (onTestSelected) onTestSelected('', '');
            return;
        }

        setCustomValue('');
        onChange(newValue);
        const opt = options.find((o) => o.value === newValue);
        if (opt && onTestSelected) {
            const testObj = allTests.find(t => t.test_code === newValue);
            onTestSelected(opt.value, opt.label, testObj?.time);
        }
    };

    const handleAddOther = (query: string) => {
        setSelectedOptionValue('otro');
        setCustomValue(query);
        onChange(query);
        if (onTestSelected) onTestSelected(query, query);
    };

    const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        setCustomValue(next);
        onChange(next);
        if (onTestSelected) onTestSelected(next, next);
    };

    return (
        <div className="flex flex-col md:flex-row md:items-start gap-2">
            <div className={isOtherSelected ? 'w-full md:flex-1' : 'w-full'}>
                <Combobox
                    value={selectedOptionValue}
                    onChange={handleChange}
                    onBlur={onBlur}
                    options={options}
                    placeholder={loading ? 'Cargando pruebas...' : placeholder}
                    disabled={disabled || loading}
                    error={error}
                    name={name}
                    required={required}
                    noResultsActionLabel="Agregar otra (especificar)"
                    onNoResultsAction={handleAddOther}
                />
            </div>

            {isOtherSelected && (
                <Input
                    type="text"
                    value={customValue}
                    onChange={handleCustomInputChange}
                    placeholder="Escriba otra prueba"
                    disabled={disabled || loading}
                    className="w-full md:flex-1"
                />
            )}
        </div>
    );
}
