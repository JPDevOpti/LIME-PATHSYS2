'use client';

import { useState, useCallback } from 'react';
import { BaseCard, BaseButton, BaseInput, BaseCheckbox } from '@/shared/components/base';
import { FormField } from '@/shared/components/ui/form';
import { Input, Textarea } from '@/shared/components/ui/form';
import { SuccessModal } from '@/shared/components/overlay/SuccessModal';
import { labTestsService } from '../services/lab-tests.service';
import type { TestFormModel, LabTest, TestAgreement } from '../types/lab-tests.types';
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
    if (!data.testCode?.trim()) errors.testCode = 'Code is required';
    else if (!/^[A-Z0-9_-]+$/i.test(data.testCode)) {
        errors.testCode = 'Only letters, numbers, hyphens and underscores allowed';
    }
    if (!data.testName?.trim()) errors.testName = 'Name is required';
    if (!data.testDescription?.trim()) errors.testDescription = 'Description is required';
    if (!data.timeDays || data.timeDays <= 0) errors.timeDays = 'Enter a valid time in days';
    else if (data.timeDays > 365) errors.timeDays = 'Maximum 365 days';
    if (data.price === undefined || data.price === null) errors.price = 'Price is required';
    else if (data.price < 0) errors.price = 'Price cannot be negative';
    return errors;
}

const formatDate = (s: string) => {
    try {
        return new Date(s).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'N/D';
    }
};

export function CreateTestForm() {
    const [form, setForm] = useState<TestFormModel>({ ...INITIAL_FORM });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [codeCheckError, setCodeCheckError] = useState('');
    const [createdTest, setCreatedTest] = useState<LabTest | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

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
            if (exists) setCodeCheckError('Este código ya está en uso');
        } catch {
            setCodeCheckError('Error al verificar el código');
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
        setIsLoading(true);
        try {
            const result = await labTestsService.create({
                test_code: form.testCode.trim().toUpperCase(),
                name: form.testName.trim(),
                description: form.testDescription.trim(),
                time: form.timeDays,
                price: form.price,
                is_active: form.isActive,
                agreements: form.agreements
            });
            setCreatedTest(result);
            setShowSuccess(true);
            setForm({ ...INITIAL_FORM });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al guardar la prueba';
            setErrors({ submit: msg });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setForm({ ...INITIAL_FORM });
        setErrors({});
        setCodeCheckError('');
    };

    return (
        <>
            <BaseCard className="p-6">
                <h4 className="text-base font-semibold text-neutral-800 mb-4">Formulario de Prueba</h4>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
                    <div className="col-span-full md:col-span-6">
                        <FormField label="Nombre de la prueba" error={errors.testName} htmlFor="testName">
                            <Input
                                id="testName"
                                placeholder="Ej. Biopsia"
                                value={form.testName}
                                onChange={(e) => update('testName', e.target.value)}
                                error={errors.testName}
                            />
                        </FormField>
                    </div>
                    <div className="col-span-full md:col-span-6">
                        <FormField label="Test code" error={errors.testCode || codeCheckError} htmlFor="testCode">
                            <Input
                                id="testCode"
                                placeholder="e.g. BIO-01"
                                value={form.testCode}
                                onChange={(e) => update('testCode', e.target.value)}
                                onBlur={checkCode}
                                error={errors.testCode || codeCheckError}
                            />
                        </FormField>
                    </div>
                    <div className="col-span-full md:col-span-6">
                        <FormField label="Tiempo estimado (días)" error={errors.timeDays} htmlFor="timeDays">
                            <Input
                                id="timeDays"
                                type="number"
                                min={1}
                                max={365}
                                placeholder="Ej. 7"
                                value={form.timeDays || ''}
                                onChange={(e) => update('timeDays', parseInt(e.target.value, 10) || 0)}
                                error={errors.timeDays}
                            />
                        </FormField>
                    </div>
                    <div className="col-span-full md:col-span-6">
                        <FormField label="Price (COP)" error={errors.price} htmlFor="price">
                            <Input
                                id="price"
                                type="number"
                                min={0}
                                step={100}
                                placeholder="e.g. 50000"
                                value={form.price === 0 ? '' : form.price}
                                onChange={(e) => update('price', parseFloat(e.target.value) || 0)}
                                error={errors.price}
                            />
                        </FormField>
                    </div>
                    <div className="col-span-full">
                        <FormField label="Descripción" error={errors.testDescription} htmlFor="testDescription">
                            <Textarea
                                id="testDescription"
                                placeholder="Descripción detallada de la prueba"
                                rows={3}
                                value={form.testDescription}
                                onChange={(e) => update('testDescription', e.target.value)}
                                error={errors.testDescription}
                            />
                        </FormField>
                    </div>
                    
                    <div className="col-span-full">
                        <TestAgreementsForm 
                            agreements={form.agreements}
                            onChange={(agreements) => update('agreements', agreements)}
                        />
                    </div>

                    <div className="col-span-full flex items-center pt-4">
                        <BaseCheckbox
                            label="Activo"
                            checked={form.isActive}
                            onChange={(e) => update('isActive', e.target.checked)}
                        />
                    </div>
                    {errors.submit && (
                        <div className="col-span-full text-sm font-medium text-red-600">{errors.submit}</div>
                    )}
                    <div className="col-span-full flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end pt-4 border-t border-neutral-200">
                        <BaseButton type="button" variant="secondary" onClick={handleClear} disabled={isLoading}>
                            Limpiar
                        </BaseButton>
                        <BaseButton type="submit" disabled={isLoading}>
                            {isLoading ? 'Guardando...' : 'Guardar Prueba'}
                        </BaseButton>
                    </div>
                </form>
            </BaseCard>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    setCreatedTest(null);
                }}
                title="Prueba registrada correctamente"
                description=""
                variant="create"
                footer={
                    <BaseButton onClick={() => setShowSuccess(false)}>Cerrar</BaseButton>
                }
            >
                {createdTest && (
                    <div className="space-y-4">
                        <div className="mb-4 pb-3 border-b border-neutral-100">
                            <h3 className="text-xl font-bold text-neutral-900 mb-2">{createdTest.name}</h3>
                            <p className="text-neutral-600">
                                <span className="font-medium">Código:</span>{' '}
                                <span className="font-mono font-bold text-neutral-800 ml-1">
                                    {createdTest.test_code}
                                </span>
                            </p>
                        </div>
                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-neutral-500 font-medium block mb-1">Tiempo estimado:</span>
                                    <p className="text-neutral-800 font-semibold">
                                        {createdTest.time} día{createdTest.time !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-neutral-500 font-medium block mb-1">Precio base:</span>
                                    <p className="text-neutral-800 font-semibold">
                                        ${createdTest.price?.toLocaleString('es-CO') || '0'} COP
                                    </p>
                                </div>
                            </div>
                            <div>
                                <span className="text-neutral-500 font-medium block mb-1">Estado:</span>
                                <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        createdTest.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}
                                >
                                    {createdTest.is_active ? 'Activa' : 'Inactiva'}
                                </span>
                            </div>
                            {createdTest.agreements && createdTest.agreements.length > 0 && (
                                <div>
                                    <span className="text-neutral-500 font-medium block mb-1">Convenios ({createdTest.agreements.length}):</span>
                                    <div className="mt-2 space-y-1">
                                        {createdTest.agreements.map((agg) => (
                                            <div key={agg.entity_id} className="flex justify-between text-xs bg-neutral-50 p-2 rounded border border-neutral-100">
                                                <span className="text-neutral-700 font-medium">{agg.entity_name}</span>
                                                <span className="text-neutral-900 font-bold">${agg.price.toLocaleString('es-CO')} COP</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <span className="text-neutral-500 font-medium block mb-1">Fecha de creación:</span>
                                <p className="text-neutral-800 font-semibold">{formatDate(createdTest.created_at)}</p>
                            </div>
                        </div>
                        {createdTest.description && (
                            <div>
                                <span className="text-neutral-500 font-medium block mb-2">Descripción:</span>
                                <p className="text-neutral-800 bg-neutral-50 p-3 rounded-lg text-sm">{createdTest.description}</p>
                            </div>
                        )}
                    </div>
                )}
            </SuccessModal>
        </>
    );
}
