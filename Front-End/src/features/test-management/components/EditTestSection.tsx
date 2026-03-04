'use client';

import { useState, useEffect, useCallback } from 'react';
import { BaseCard, BaseButton, BaseInput, BaseCheckbox } from '@/shared/components/base';
import { FormField } from '@/shared/components/ui/form';
import { Input, Textarea } from '@/shared/components/ui/form';
import { SuccessModal } from '@/shared/components/overlay/SuccessModal';
import { labTestsService } from '../services/lab-tests.service';
import type { LabTest } from '../types/lab-tests.types';

interface TestEditForm {
    id: string;
    testCode: string;
    testName: string;
    testDescription: string;
    timeDays: number;
    price: number;
    isActive: boolean;
}

function validateForm(data: TestEditForm): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!data.testCode?.trim()) errors.testCode = 'El código es requerido';
    else if (!/^[A-Z0-9_-]+$/i.test(data.testCode)) {
        errors.testCode = 'Solo letras, números, guiones y guiones bajos';
    }
    if (!data.testName?.trim()) errors.testName = 'El nombre es requerido';
    if (!data.testDescription?.trim()) errors.testDescription = 'La descripción es requerida';
    if (!data.timeDays || data.timeDays <= 0) errors.timeDays = 'Ingresa un tiempo válido en días';
    else if (data.timeDays > 365) errors.timeDays = 'Máximo 365 días';
    if (data.price === undefined || data.price === null) errors.price = 'El precio es requerido';
    else if (data.price < 0) errors.price = 'El precio no puede ser negativo';
    return errors;
}

const formatDate = (s: string) => {
    try {
        return new Date(s).toLocaleDateString('es-ES', {
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

export function EditTestSection() {
    const [tests, setTests] = useState<LabTest[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
    const [form, setForm] = useState<TestEditForm | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [updatedTest, setUpdatedTest] = useState<LabTest | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const loadTests = useCallback(async () => {
        setIsLoadingList(true);
        try {
            const list = await labTestsService.getAll(true);
            setTests(list);
        } catch {
            setTests([]);
        } finally {
            setIsLoadingList(false);
        }
    }, []);

    useEffect(() => {
        loadTests();
    }, [loadTests]);

    const filteredTests = tests.filter((t) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            t.name.toLowerCase().includes(q) ||
            t.test_code.toLowerCase().includes(q)
        );
    });

    const updateForm = useCallback((field: keyof TestEditForm, value: string | number | boolean) => {
        setForm((p) => (p ? { ...p, [field]: value } : null));
        setErrors((e) => {
            const next = { ...e };
            delete next[field];
            return next;
        });
    }, []);

    const hasChanges = form && selectedTest && (
        form.testName !== selectedTest.name ||
        form.testDescription !== selectedTest.description ||
        form.timeDays !== selectedTest.time ||
        form.price !== selectedTest.price ||
        form.isActive !== selectedTest.is_active
    );

    const handleSelectTest = (test: LabTest) => {
        setSelectedTest(test);
        setForm({
            id: test.id,
            testCode: test.test_code,
            testName: test.name,
            testDescription: test.description,
            timeDays: test.time,
            price: test.price,
            isActive: test.is_active
        });
        setErrors({});
    };

    const handleReset = () => {
        if (selectedTest) {
            setForm({
                id: selectedTest.id,
                testCode: selectedTest.test_code,
                testName: selectedTest.name,
                testDescription: selectedTest.description,
                timeDays: selectedTest.time,
                price: selectedTest.price,
                isActive: selectedTest.is_active
            });
            setErrors({});
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form || !selectedTest) return;
        const validation = validateForm(form);
        if (Object.keys(validation).length > 0) {
            setErrors(validation);
            return;
        }
        setErrors({});
        setIsLoading(true);
        try {
            const result = await labTestsService.update(selectedTest.test_code, {
                name: form.testName.trim(),
                description: form.testDescription.trim(),
                time: form.timeDays,
                price: form.price,
                is_active: form.isActive
            });
            setUpdatedTest(result);
            setShowSuccess(true);
            setSelectedTest(result);
            setForm({
                id: result.id,
                testCode: result.test_code,
                testName: result.name,
                testDescription: result.description,
                timeDays: result.time,
                price: result.price,
                isActive: result.is_active
            });
            await loadTests();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to update test';
            setErrors({ submit: msg });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <BaseCard className="p-6">
                <h4 className="text-base font-semibold text-neutral-800 mb-1">Filtrar Pruebas Médicas</h4>
                <div className="flex gap-2 items-end mt-2">
                    <div className="flex-1">
                        <Input
                            placeholder="Filtrar por nombre o código..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <BaseButton variant="secondary" onClick={() => setSearchQuery('')} disabled={isLoadingList}>
                        Limpiar
                    </BaseButton>
                </div>
            </BaseCard>

            <BaseCard className="p-6 overflow-hidden">
                <h4 className="text-base font-semibold text-neutral-800 mb-1">Pruebas disponibles</h4>
                {isLoadingList ? (
                    <div className="py-8 text-center text-sm text-neutral-500">Cargando pruebas...</div>
                ) : filteredTests.length === 0 ? (
                    <div className="py-8 text-center text-sm text-neutral-500">
                        No se encontraron pruebas que coincidan con tu búsqueda
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <table className="min-w-full divide-y divide-neutral-200">
                            <thead className="bg-neutral-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">
                                        Name
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase hidden sm:table-cell">
                                        Code
                                    </th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase">
                                        Status
                                    </th>
                                    <th className="relative px-4 py-2">
                                        <span className="sr-only">Select</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-neutral-200">
                                {filteredTests.map((t) => (
                                    <tr
                                        key={t.id}
                                        className={`cursor-pointer transition-colors ${
                                            selectedTest?.id === t.id
                                                ? 'bg-blue-50 ring-2 ring-blue-400'
                                                : 'hover:bg-neutral-50'
                                        }`}
                                        onClick={() => handleSelectTest(t)}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-neutral-900 truncate max-w-[200px]">
                                                {t.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-500 hidden sm:table-cell">
                                            {t.test_code}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    t.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                {t.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {filteredTests.length > 5 && (
                    <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-500 text-center">
                        Showing {filteredTests.length} tests. Scroll to see more.
                    </div>
                )}
            </BaseCard>

            {selectedTest && form && (
                <BaseCard className="p-6">
                    <h4 className="text-base font-semibold text-neutral-800 mb-1">Editar Prueba</h4>
                    <p className="text-sm text-neutral-600 mt-1 mb-4">Modifica los datos de la prueba médica</p>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
                        <div className="col-span-full md:col-span-6">
                            <FormField label="Test name" error={errors.testName} htmlFor="edit-testName">
                                <Input
                                    id="edit-testName"
                                    placeholder="e.g. Biopsy"
                                    value={form.testName}
                                    onChange={(e) => updateForm('testName', e.target.value)}
                                    error={errors.testName}
                                />
                            </FormField>
                        </div>
                        <div className="col-span-full md:col-span-6">
                            <FormField label="Código de prueba" error={errors.testCode} htmlFor="edit-testCode">
                                <Input
                                    id="edit-testCode"
                                    placeholder="e.g. BIO-01"
                                    value={form.testCode}
                                    disabled
                                    error={errors.testCode}
                                />
                            </FormField>
                        </div>
                        <div className="col-span-full md:col-span-6">
                            <FormField label="Tiempo estimado (días)" error={errors.timeDays} htmlFor="edit-timeDays">
                                <Input
                                    id="edit-timeDays"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={form.timeDays || ''}
                                    onChange={(e) => updateForm('timeDays', parseInt(e.target.value, 10) || 0)}
                                    error={errors.timeDays}
                                />
                            </FormField>
                        </div>
                        <div className="col-span-full md:col-span-6">
                            <FormField label="Precio (COP)" error={errors.price} htmlFor="edit-price">
                                <Input
                                    id="edit-price"
                                    type="number"
                                    min={0}
                                    step={100}
                                    value={form.price === 0 ? '' : form.price}
                                    onChange={(e) => updateForm('price', parseFloat(e.target.value) || 0)}
                                    error={errors.price}
                                />
                            </FormField>
                        </div>
                        <div className="col-span-full">
                            <FormField label="Description" error={errors.testDescription} htmlFor="edit-testDescription">
                                <Textarea
                                    id="edit-testDescription"
                                    placeholder="Detailed description"
                                    rows={3}
                                    value={form.testDescription}
                                    onChange={(e) => updateForm('testDescription', e.target.value)}
                                    error={errors.testDescription}
                                />
                            </FormField>
                        </div>
                        <div className="col-span-full flex items-center pt-4">
                            <BaseCheckbox
                                label="Activo"
                                checked={form.isActive}
                                onChange={(e) => updateForm('isActive', e.target.checked)}
                            />
                        </div>
                        {errors.submit && (
                            <div className="col-span-full text-sm font-medium text-red-600">{errors.submit}</div>
                        )}
                        <div className="col-span-full flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end pt-4 border-t border-neutral-200">
                            <BaseButton
                                type="button"
                                variant="secondary"
                                onClick={handleReset}
                                disabled={isLoading || !hasChanges}
                            >
                                Reiniciar
                            </BaseButton>
                            <BaseButton type="submit" disabled={isLoading || !hasChanges}>
                                {isLoading ? 'Actualizando...' : 'Actualizar Prueba'}
                            </BaseButton>
                        </div>
                    </form>
                </BaseCard>
            )}

            {!selectedTest && !isLoadingList && tests.length > 0 && (
                <BaseCard className="p-6">
                    <div className="text-center py-8">
                        <div className="text-neutral-400 mb-2">
                            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-neutral-900 mb-1">Selecciona una prueba</h3>
                        <p className="text-neutral-600">Busca y selecciona una prueba de la lista para editarla.</p>
                    </div>
                </BaseCard>
            )}

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    setUpdatedTest(null);
                }}
                title="Prueba Actualizada Exitosamente"
                description=""
                variant="edit"
                footer={
                    <BaseButton onClick={() => setShowSuccess(false)}>Close</BaseButton>
                }
            >
                {updatedTest && (
                    <div className="space-y-4">
                        <div className="mb-4 pb-3 border-b border-neutral-100">
                            <h3 className="text-xl font-bold text-neutral-900 mb-2">{updatedTest.name}</h3>
                            <p className="text-neutral-600">
                                <span className="font-medium">Código:</span>{' '}
                                <span className="font-mono font-bold text-neutral-800 ml-1">
                                    {updatedTest.test_code}
                                </span>
                            </p>
                        </div>
                        <div className="space-y-4 text-sm">
                            <div>
                                <span className="text-neutral-500 font-medium block mb-1">Tiempo estimado:</span>
                                <p className="text-neutral-800 font-semibold">
                                    {updatedTest.time} día{updatedTest.time !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div>
                                <span className="text-neutral-500 font-medium block mb-1">Price:</span>
                                <p className="text-neutral-800 font-semibold">
                                    ${updatedTest.price?.toLocaleString('es-CO') || '0'} COP
                                </p>
                            </div>
                            <div>
                                <span className="text-neutral-500 font-medium block mb-1">Estado:</span>
                                <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        updatedTest.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}
                                >
                                    {updatedTest.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            <div>
                                <span className="text-neutral-500 font-medium block mb-1">Last updated:</span>
                                <p className="text-neutral-800 font-semibold">
                                    {formatDate(updatedTest.updated_at || updatedTest.created_at)}
                                </p>
                            </div>
                        </div>
                        {updatedTest.description && (
                            <div>
                                <span className="text-neutral-500 font-medium block mb-2">Descripción:</span>
                                <p className="text-neutral-800 bg-neutral-50 p-3 rounded-lg">{updatedTest.description}</p>
                            </div>
                        )}
                    </div>
                )}
            </SuccessModal>
        </>
    );
}
