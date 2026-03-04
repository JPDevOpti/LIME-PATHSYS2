'use client';

import { Plus, Trash2 } from 'lucide-react';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton } from '@/shared/components/base';
import { Input } from '@/shared/components/ui/form';
import { TestsCombobox } from '@/shared/components/lists';
import type { AdditionalTest } from '../types/results.types';

interface AdditionalTestsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tests: AdditionalTest[];
    onTestsChange: (tests: AdditionalTest[]) => void;
    reason: string;
    onReasonChange: (value: string) => void;
    onSave: () => void | Promise<void>;
    disabled?: boolean;
    saving?: boolean;
}

export function AdditionalTestsModal({
    isOpen,
    onClose,
    tests,
    onTestsChange,
    reason,
    onReasonChange,
    onSave,
    disabled = false,
    saving = false,
}: AdditionalTestsModalProps) {
    const addTest = () => {
        onTestsChange([...tests, { code: '', name: '', quantity: 1 }]);
    };

    const updateTest = (index: number, field: keyof AdditionalTest, value: string | number) => {
        const next = [...tests];
        next[index] = { ...next[index], [field]: value };
        onTestsChange(next);
    };

    const handleTestSelected = (index: number, code: string, name: string) => {
        const next = [...tests];
        next[index] = { ...next[index], code, name };
        onTestsChange(next);
    };

    const removeTest = (index: number) => {
        onTestsChange(tests.filter((_, i) => i !== index));
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Crear solicitud de pruebas adicionales"
            size="3xl"
            footer={
                <>
                    <BaseButton variant="secondary" size="sm" onClick={onClose}>
                        Cancelar
                    </BaseButton>
                    <BaseButton variant="primary" size="sm" onClick={onSave} disabled={disabled || saving} loading={saving}>
                        Guardar solicitud
                    </BaseButton>
                </>
            }
        >
            <div className="space-y-4">
                <div className="space-y-2">
                    {tests.map((test, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                            <div className="flex-1 min-w-0">
                                <TestsCombobox
                                    value={test.code}
                                    onChange={(v) => updateTest(idx, 'code', v)}
                                    onTestSelected={(code, name) => handleTestSelected(idx, code, name)}
                                    placeholder="Buscar y seleccionar prueba..."
                                    disabled={disabled}
                                    extraOptions={tests.map((t) => ({ code: t.code, name: t.name }))}
                                />
                            </div>
                            <Input
                                type="number"
                                min={1}
                                value={test.quantity}
                                onChange={(e) =>
                                    updateTest(idx, 'quantity', parseInt(e.target.value) || 1)
                                }
                                disabled={disabled}
                                className="w-14 shrink-0"
                            />
                            <BaseButton
                                variant="secondary"
                                size="sm"
                                onClick={() => removeTest(idx)}
                                disabled={disabled || tests.length <= 1}
                            >
                                <Trash2 className="h-4 w-4" />
                            </BaseButton>
                        </div>
                    ))}
                    <BaseButton
                        variant="secondary"
                        size="sm"
                        onClick={addTest}
                        disabled={disabled}
                        startIcon={<Plus className="w-4 h-4" />}
                    >
                        Agregar prueba
                    </BaseButton>
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Motivo de la solicitud
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => onReasonChange(e.target.value)}
                        placeholder="Describa el motivo por el cual se requieren estas pruebas adicionales..."
                        disabled={disabled}
                        rows={3}
                        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-brand-500"
                    />
                </div>
            </div>
        </BaseModal>
    );
}

export const ComplementaryTestsModal = AdditionalTestsModal;
