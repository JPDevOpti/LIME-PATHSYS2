'use client';

import { useState, useEffect, useCallback } from 'react';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton, BaseCheckbox } from '@/shared/components/base';
import { FormField, Input, Textarea } from '@/shared/components/ui/form';
import { labTestsService } from '../services/lab-tests.service';
import type { LabTest, UpdateTestRequest, TestAgreement } from '../types/lab-tests.types';
import { TestAgreementsForm } from './TestAgreementsForm';

function validateForm(data: { testName: string; testDescription: string; timeDays: number; price: number }): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!data.testName?.trim()) errors.testName = 'El nombre es obligatorio';
    if (!data.testDescription?.trim()) errors.testDescription = 'La descripcion es obligatoria';
    if (!data.timeDays || data.timeDays <= 0) errors.timeDays = 'Ingresa un tiempo valido en dias';
    else if (data.timeDays > 365) errors.timeDays = 'Maximo 365 dias';
    if (data.price === undefined || data.price === null) errors.price = 'El precio es obligatorio';
    else if (data.price < 0) errors.price = 'El precio no puede ser negativo';
    return errors;
}

interface EditTestModalProps {
    test: LabTest | null;
    onClose: () => void;
    onSave: () => void;
}

export function EditTestModal({ test, onClose, onSave }: EditTestModalProps) {
    const [testName, setTestName] = useState('');
    const [testDescription, setTestDescription] = useState('');
    const [timeDays, setTimeDays] = useState(1);
    const [price, setPrice] = useState(0);
    const [isActive, setIsActive] = useState(true);
    const [agreements, setAgreements] = useState<TestAgreement[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (test) {
            setTestName(test.name);
            setTestDescription(test.description);
            setTimeDays(test.time);
            setPrice(test.price);
            setIsActive(test.is_active);
            setAgreements(test.agreements || []);
            setErrors({});
        }
    }, [test]);

    const update = useCallback((field: string, value: string | number | boolean | TestAgreement[]) => {
        if (field === 'testName') setTestName(value as string);
        if (field === 'testDescription') setTestDescription(value as string);
        if (field === 'timeDays') setTimeDays(value as number);
        if (field === 'price') setPrice(value as number);
        if (field === 'isActive') setIsActive(value as boolean);
        if (field === 'agreements') setAgreements(value as TestAgreement[]);
        setErrors((e) => {
            const next = { ...e };
            delete next[field];
            return next;
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!test) return;
        const data = { testName, testDescription, timeDays, price };
        const validation = validateForm(data);
        if (Object.keys(validation).length > 0) {
            setErrors(validation);
            return;
        }
        setErrors({});
        setSaving(true);
        try {
            const payload: UpdateTestRequest = {
                name: testName.trim(),
                description: testDescription.trim(),
                time: timeDays,
                price,
                is_active: isActive,
                agreements: agreements,
            };
            await labTestsService.update(test.test_code, payload);
            onSave();
            onClose();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al actualizar la prueba';
            setErrors({ submit: msg });
        } finally {
            setSaving(false);
        }
    };

    const data = { testName, testDescription, timeDays, price };
    const isValid = Object.keys(validateForm(data)).length === 0;

    if (!test) return null;

    return (
        <BaseModal
            isOpen={!!test}
            onClose={onClose}
            title={`Editar prueba: ${test.name}`}
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
                        Guardar
                    </BaseButton>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Nombre de la prueba" error={errors.testName} htmlFor="edit-modal-testName">
                        <Input
                            id="edit-modal-testName"
                            placeholder="Ej. Biopsia"
                            value={testName}
                            onChange={(e) => update('testName', e.target.value)}
                        />
                    </FormField>
                    <FormField label="Codigo" htmlFor="edit-modal-testCode">
                        <Input
                            id="edit-modal-testCode"
                            value={test.test_code}
                            disabled
                            className="bg-neutral-100"
                        />
                    </FormField>
                    <FormField label="Tiempo estimado (dias)" error={errors.timeDays} htmlFor="edit-modal-timeDays">
                        <Input
                            id="edit-modal-timeDays"
                            type="number"
                            min={1}
                            max={365}
                            value={timeDays || ''}
                            onChange={(e) => update('timeDays', parseInt(e.target.value, 10) || 0)}
                        />
                    </FormField>
                    <FormField label="Precio (COP)" error={errors.price} htmlFor="edit-modal-price">
                        <Input
                            id="edit-modal-price"
                            type="number"
                            min={0}
                            step={100}
                            value={price === 0 ? '' : price}
                            onChange={(e) => update('price', parseFloat(e.target.value) || 0)}
                        />
                    </FormField>
                </div>
                <FormField label="Descripcion" error={errors.testDescription} htmlFor="edit-modal-testDescription">
                    <Textarea
                        id="edit-modal-testDescription"
                        placeholder="Descripcion detallada de la prueba"
                        rows={3}
                        value={testDescription}
                        onChange={(e) => update('testDescription', e.target.value)}
                    />
                </FormField>
                <BaseCheckbox
                    label="Prueba activa"
                    checked={isActive}
                    onChange={(e) => update('isActive', e.target.checked)}
                />
                
                <TestAgreementsForm 
                    agreements={agreements}
                    onChange={(agg) => update('agreements', agg)}
                />

                {errors.submit && (
                    <div className="text-sm font-medium text-red-600">{errors.submit}</div>
                )}
            </form>
        </BaseModal>
    );
}
