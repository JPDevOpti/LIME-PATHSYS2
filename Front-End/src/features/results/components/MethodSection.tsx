'use client';

import { Select } from '@/shared/components/ui/form';
import { BaseButton } from '@/shared/components/base';
import { Plus, Trash2 } from 'lucide-react';
import { AVAILABLE_METHODS } from '@/shared/data/methods';

interface MethodSectionProps {
    value: string[];
    onChange: (value: string[]) => void;
    showValidation?: boolean;
    disabled?: boolean;
}

export function MethodSection({ value, onChange, showValidation = false, disabled }: MethodSectionProps) {
    const methods = value?.length ? [...value] : [''];

    const addMethod = () => {
        onChange([...methods, '']);
    };

    const removeMethod = (index: number) => {
        if (methods.length <= 1) return;
        const next = methods.filter((_, i) => i !== index);
        onChange(next);
    };

    const updateMethod = (index: number, val: string) => {
        const next = [...methods];
        next[index] = val;
        onChange(next);
    };

    const hasEmpty = methods.some((m) => !m?.trim());
    const isEmpty = (i: number) => !methods[i] || !methods[i].trim();

    const selectOptions = AVAILABLE_METHODS.map((m) => ({ value: m.value, label: m.label }));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-neutral-700">Métodos Utilizados</label>
                <BaseButton
                    type="button"
                    size="sm"
                    onClick={addMethod}
                    disabled={disabled}
                    startIcon={<Plus className="w-4 h-4" />}
                    className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium text-xs h-9 px-3 py-1.5 shadow-none"
                >
                    Agregar
                </BaseButton>
            </div>
            <div className="space-y-6">
                {methods.map((m, i) => (
                    <div
                        key={i}
                        className={`flex items-center gap-3 rounded-lg border p-3 bg-white ${
                            showValidation && isEmpty(i) ? 'border-red-300 ring-1 ring-red-200' : 'border-neutral-200'
                        }`}
                    >
                        <div className="flex-1 min-w-0">
                            <Select
                                value={m}
                                onChange={(e) => updateMethod(i, e.target.value)}
                                options={selectOptions}
                                placeholder="Seleccionar método..."
                                disabled={disabled}
                            />
                        </div>
                        <BaseButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMethod(i)}
                            disabled={methods.length <= 1 || disabled}
                            className="shrink-0 text-neutral-500 hover:text-red-600"
                        >
                            <Trash2 className="w-4 h-4" />
                        </BaseButton>
                    </div>
                ))}
            </div>
            {showValidation && hasEmpty && (
                <p className="text-xs text-red-600 mt-2">
                    Hay métodos vacíos. Seleccione un método o elimínelo.
                </p>
            )}
        </div>
    );
}
