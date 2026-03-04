'use client';

import { useState, useEffect } from 'react';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton } from '@/shared/components/base';
import { Input } from '@/shared/components/ui/form';
import { Select } from '@/shared/components/ui/form';
import { FormField } from '@/shared/components/ui/form';
import { Plus, Trash2 } from 'lucide-react';
import { labTestsService as additionalTestsService } from '@/features/test-management/services/lab-tests.service';
import type { LabTest as AdditionalTest } from '@/features/test-management/types/lab-tests.types';
import type { ApprovalRequestResponse, AdditionalTestInfo } from '../types/cases-approval.types';
import { formatDate, getStatusText } from '../utils/approval-adapter';

interface AdditionalTestsDetailsModalProps {
    caseItem: ApprovalRequestResponse | null;
    onClose: () => void;
    onTestsUpdated: (tests: AdditionalTestInfo[]) => void;
}

export function AdditionalTestsDetailsModal({
    caseItem,
    onClose,
    onTestsUpdated
}: AdditionalTestsDetailsModalProps) {
    const [isEditingTests, setIsEditingTests] = useState(false);
    const [editableTests, setEditableTests] = useState<AdditionalTestInfo[]>([]);
    const [availableTests, setAvailableTests] = useState<AdditionalTest[]>([]);
    const [saving, setSaving] = useState(false);

    const canEditTests =
        caseItem?.approval_state === 'request_made' || caseItem?.approval_state === 'pending_approval';

    useEffect(() => {
        additionalTestsService.getAll(true).then(setAvailableTests);
    }, []);

    useEffect(() => {
        if (caseItem) {
            setEditableTests((caseItem.additional_tests || []).map((t) => ({ ...t })));
            setIsEditingTests(false);
        }
    }, [caseItem]);

    const getPathologistName = () =>
        caseItem?.approval_info?.assigned_pathologist?.name || 'Sin asignar';

    const getReason = () => caseItem?.approval_info?.reason || null;

    const startEditing = () => {
        setEditableTests((caseItem?.additional_tests || []).map((t) => ({ ...t })));
        setIsEditingTests(true);
    };

    const cancelEditing = () => {
        setEditableTests((caseItem?.additional_tests || []).map((t) => ({ ...t })));
        setIsEditingTests(false);
    };

    const addTest = () => {
        setEditableTests((prev) => [...prev, { code: '', name: '', quantity: 1 }]);
    };

    const updateTest = (index: number, field: keyof AdditionalTestInfo, value: string | number) => {
        setEditableTests((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            if (field === 'code') {
                const test = availableTests.find((t) => t.test_code === value);
                if (test) next[index].name = test.name;
            }
            return next;
        });
    };

    const removeTest = (index: number) => {
        setEditableTests((prev) => prev.filter((_, i) => i !== index));
    };

    const saveTests = async () => {
        if (!caseItem) return;
        setSaving(true);
        try {
            const valid = editableTests.filter((t) => t.code?.trim());
            onTestsUpdated(valid);
            setIsEditingTests(false);
        } finally {
            setSaving(false);
        }
    };

    const testOptions = availableTests.map((t) => ({
        value: t.test_code,
        label: `${t.test_code} - ${t.name}`
    }));

    if (!caseItem) return null;

    return (
        <BaseModal
            isOpen={!!caseItem}
            onClose={onClose}
            title="Pruebas adicionales"
            size="4xl"
            footer={
                <BaseButton variant="secondary" size="sm" onClick={onClose}>
                    Cerrar
                </BaseButton>
            }
        >
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-neutral-50 rounded-xl p-4">
                    <div>
                        <p className="text-xs text-neutral-500">Codigo</p>
                        <p className="text-sm font-medium text-neutral-900">{caseItem.approval_code || 'N/D'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500">Referencia</p>
                        <p className="text-sm font-medium text-neutral-900">{caseItem.original_case_code || 'N/D'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500">Estado</p>
                        <p className="text-sm font-medium text-neutral-900">{getStatusText(caseItem.approval_state)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500">Fecha</p>
                        <p className="text-sm font-medium text-neutral-900">{formatDate(caseItem.created_at)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 bg-neutral-50 rounded-xl p-4">
                    <div>
                        <p className="text-xs text-neutral-500">Última Actualización</p>
                        <p className="text-sm font-medium text-neutral-900">{formatDate(caseItem.updated_at)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500">Patólogo Asignado</p>
                        <p className="text-sm font-medium text-neutral-900">{getPathologistName()}</p>
                    </div>
                </div>

                {getReason() && (
                    <div className="bg-neutral-50 rounded-xl p-4">
                        <h5 className="text-xs font-medium text-neutral-600 mb-2">Motivo</h5>
                        <p className="text-sm text-neutral-800 whitespace-pre-line">{getReason()}</p>
                    </div>
                )}

                <div className="bg-neutral-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h5 className="text-xs font-medium text-neutral-600">Pruebas adicionales</h5>
                        {!isEditingTests && canEditTests && (
                            <BaseButton variant="secondary" size="sm" onClick={startEditing}>
                                Editar
                            </BaseButton>
                        )}
                    </div>

                    {!isEditingTests ? (
                        <>
                            {(caseItem.additional_tests || []).length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {(caseItem.additional_tests || []).map((t, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800"
                                        >
                                            {t.code} - {t.name} (x{t.quantity})
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-neutral-500">Sin pruebas adicionales</p>
                            )}
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-end">
                                <BaseButton variant="secondary" size="sm" onClick={addTest} startIcon={<Plus className="w-4 h-4" />}>
                                    Agregar Prueba
                                </BaseButton>
                            </div>
                            {editableTests.length === 0 ? (
                                <p className="text-sm text-neutral-500 text-center py-4">
                                    No hay pruebas adicionales configuradas. Haz clic en "Agregar Prueba" para agregar una.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {editableTests.map((test, index) => (
                                        <div className="p-3 bg-white border border-neutral-200 rounded-lg flex gap-2 items-end" key={index}>
                                            <FormField label={`Prueba #${index + 1}`} className="flex-1">
                                                <Select
                                                    value={test.code}
                                                    onChange={(e) => updateTest(index, 'code', e.target.value)}
                                                    options={[{ value: '', label: 'Seleccionar prueba' }, ...testOptions]}
                                                />
                                            </FormField>
                                            <FormField label="Cantidad" className="w-20">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    value={test.quantity}
                                                    onChange={(e) => updateTest(index, 'quantity', parseInt(e.target.value) || 1)}
                                                />
                                            </FormField>
                                            <BaseButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeTest(index)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </BaseButton>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2 pt-2">
                                <BaseButton
                                    variant="primary"
                                    size="sm"
                                    onClick={saveTests}
                                    disabled={saving || editableTests.length === 0}
                                >
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </BaseButton>
                                <BaseButton variant="secondary" size="sm" onClick={cancelEditing} disabled={saving}>
                                    Cancelar
                                </BaseButton>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BaseModal>
    );
}


