'use client';

import { useState, useEffect, useCallback } from 'react';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton, BaseCheckbox } from '@/shared/components/base';
import { FormField, Input, Textarea } from '@/shared/components/ui/form';
import { labTestsService } from '../services/lab-tests.service';
import type { TestFormModel, CreateTestRequest, TestAgreement } from '../types/lab-tests.types';
import { TestAgreementsForm } from './TestAgreementsForm';

const INITIAL_FORM: TestFormModel = {
    testCode: '',
    testName: '',
    testDescription: '',
    timeDays: 1,
    price: 0,
    isActive: true,
    agreements: []
};

function validateForm(data: TestFormModel): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!data.testCode?.trim()) errors.testCode = 'El codigo es obligatorio';
    else if (!/^[A-Z0-9_-]+$/i.test(data.testCode)) {
        errors.testCode = 'Solo letras, numeros, guiones y guiones bajos';
    }
    if (!data.testName?.trim()) errors.testName = 'El nombre es obligatorio';
    if (!data.testDescription?.trim()) errors.testDescription = 'La descripcion es obligatoria';
    if (!data.timeDays || data.timeDays <= 0) errors.timeDays = 'Ingresa un tiempo valido en dias';
    else if (data.timeDays > 365) errors.timeDays = 'Maximo 365 dias';
    if (data.price === undefined || data.price === null) errors.price = 'El precio es obligatorio';
    else if (data.price < 0) errors.price = 'El precio no puede ser negativo';
    return errors;
}

interface CreateTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export function CreateTestModal({ isOpen, onClose, onSave }: CreateTestModalProps) {
    const [form, setForm] = useState<TestFormModel>({ ...INITIAL_FORM });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [codeCheckError, setCodeCheckError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setForm({ ...INITIAL_FORM });
            setErrors({});
            setCodeCheckError('');
        }
    }, [isOpen]);

    const update = useCallback((field: keyof TestFormModel, value: string | number | boolean | TestAgreement[]) => {
        setForm((p) => ({ ...p, [field]: value }));
        setErrors((e) => {
            const next = { ...e };
            delete next[field as keyof TestFormModel];
            return next;
        });
        if (field === 'testCode') setCodeCheckError('');
    }, []);

    const checkCode = useCallback(async () => {
        if (!form.testCode?.trim()) return;
        setCodeCheckError('');
        try {
            const exists = await labTestsService.checkCodeExists(form.testCode.trim());
            if (exists) setCodeCheckError('Este codigo ya esta en uso');
        } catch {
            setCodeCheckError('Error al verificar el codigo');
        }
    }, [form.testCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validation = validateForm(form);
        if (Object.keys(validation).length > 0) {
            setErrors(validation);
            return;
        }
        setErrors({});
        setSaving(true);
        try {
            const payload: CreateTestRequest = {
                test_code: form.testCode.trim().toUpperCase(),
                name: form.testName.trim(),
                description: form.testDescription.trim(),
                time: form.timeDays,
                price: form.price,
                is_active: form.isActive,
                agreements: form.agreements,
            };
            await labTestsService.create(payload);
            onSave();
            onClose();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al guardar la prueba';
            setErrors({ submit: msg });
        } finally {
            setSaving(false);
        }
    };

    const isValid = Object.keys(validateForm(form)).length === 0;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Nueva prueba"
            size="2xl"
            footer={
                <div className="flex justify-end gap-2">
                    <BaseButton variant="secondary" size="sm" onClick={onClose}>
                        Cancelar
                    </BaseButton>
                    <BaseButton
                        variant="primary"
                        size="sm"
                        onClick={handleSubmit}
                        disabled={!isValid || saving}
                        loading={saving}
                    >
                        Crear
                    </BaseButton>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Nombre de la prueba" error={errors.testName} htmlFor="modal-testName">
                        <Input
                            id="modal-testName"
                            placeholder="Ej. Biopsia"
                            value={form.testName}
                            onChange={(e) => update('testName', e.target.value)}
                        />
                    </FormField>
                    <FormField label="Codigo" error={errors.testCode || codeCheckError} htmlFor="modal-testCode">
                        <Input
                            id="modal-testCode"
                            placeholder="Ej. BIO-01"
                            value={form.testCode}
                            onChange={(e) => update('testCode', e.target.value)}
                            onBlur={checkCode}
                        />
                    </FormField>
                    <FormField label="Tiempo estimado (dias)" error={errors.timeDays} htmlFor="modal-timeDays">
                        <Input
                            id="modal-timeDays"
                            type="number"
                            min={1}
                            max={365}
                            placeholder="Ej. 7"
                            value={form.timeDays || ''}
                            onChange={(e) => update('timeDays', parseInt(e.target.value, 10) || 0)}
                        />
                    </FormField>
                    <FormField label="Precio (COP)" error={errors.price} htmlFor="modal-price">
                        <Input
                            id="modal-price"
                            type="number"
                            min={0}
                            step={100}
                            placeholder="Ej. 50000"
                            value={form.price === 0 ? '' : form.price}
                            onChange={(e) => update('price', parseFloat(e.target.value) || 0)}
                        />
                    </FormField>
                </div>
                <FormField label="Descripcion" error={errors.testDescription} htmlFor="modal-testDescription">
                    <Textarea
                        id="modal-testDescription"
                        placeholder="Descripcion detallada de la prueba"
                        rows={3}
                        value={form.testDescription}
                        onChange={(e) => update('testDescription', e.target.value)}
                    />
                </FormField>
                <BaseCheckbox
                    label="Prueba activa"
                    checked={form.isActive}
                    onChange={(e) => update('isActive', e.target.checked)}
                />

                <TestAgreementsForm 
                    agreements={form.agreements}
                    onChange={(agg) => update('agreements', agg)}
                />

                {errors.submit && (
                    <div className="text-sm font-medium text-red-600">{errors.submit}</div>
                )}
            </form>
        </BaseModal>
    );
}
