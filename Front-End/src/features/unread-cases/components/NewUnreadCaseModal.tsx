'use client';

import { useState, useEffect } from 'react';
import { UserCircle, FileText, Plus, Trash2 } from 'lucide-react';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton, BaseCheckbox } from '@/shared/components/base';
import { Input, FormField, Select, Textarea } from '@/shared/components/ui/form';
import { EntitiesCombobox, TestsCombobox } from '@/shared/components/lists';
import { ClearButton, SaveButton } from '@/shared/components/ui/buttons';
import { useAuth } from '@/features/auth/context/AuthContext';
import type {
    UnreadCase,
    UnreadCaseCreatePayload,
    UnreadCaseUpdatePayload,
    TestGroup
} from '../types/unread-cases.types';

const DOCUMENT_TYPE_OPTIONS = [
    { value: '', label: 'Seleccione...' },
    { value: 'CC', label: 'Cedula de Ciudadania' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'CE', label: 'Cedula de Extranjeria' },
    { value: 'PA', label: 'Pasaporte' },
    { value: 'RC', label: 'Registro Civil' }
];

const TEST_TYPE_OPTIONS = [
    { value: '', label: 'Seleccione...' },
    { value: 'LOW_COMPLEXITY_IHQ', label: 'IHQ Baja Complejidad' },
    { value: 'HIGH_COMPLEXITY_IHQ', label: 'IHQ Alta Complejidad' },
    { value: 'SPECIAL_IHQ', label: 'IHQ Especiales' },
    { value: 'HISTOCHEMISTRY', label: 'Histoquimicas' }
];

interface TestItem {
    code: string;
    quantity: number;
    name?: string;
}

interface FormTestGroup {
    type: string;
    tests: TestItem[];
}

const emptyTestGroup = (): FormTestGroup => ({ type: '', tests: [] });
const emptyTestItem = (): TestItem => ({ code: '', quantity: 1, name: '' });

interface NewUnreadCaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseData?: UnreadCase | null;
    onCreate?: (payload: UnreadCaseCreatePayload) => Promise<void>;
    onUpdate?: (payload: UnreadCaseUpdatePayload) => Promise<void>;
}

function parsePatientName(name?: string): { firstName: string; secondName: string; firstLastName: string; secondLastName: string } {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    return {
        firstName: parts[0] || '',
        secondName: parts[1] || '',
        firstLastName: parts[2] || '',
        secondLastName: parts[3] || ''
    };
}

export function NewUnreadCaseModal({ isOpen, onClose, caseData = null, onCreate, onUpdate }: NewUnreadCaseModalProps) {
    const isEditMode = !!caseData;
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [form, setForm] = useState({
        isSpecialCase: false,
        documentType: '',
        patientDocument: '',
        firstName: '',
        secondName: '',
        firstLastName: '',
        secondLastName: '',
        entityCode: '',
        entityName: '',
        numberOfPlates: 1,
        notes: '',
        testGroups: [emptyTestGroup()] as FormTestGroup[],
        status: 'En proceso'
    });

    useEffect(() => {
        if (user && !isEditMode) {
            setForm((p) => ({ ...p, receivedBy: user.name || user.email || '' }));
        }
    }, [user, isEditMode]);

    useEffect(() => {
        if (caseData) {
            const names = parsePatientName(caseData.patientName);
            const testGroups: FormTestGroup[] =
                caseData.testGroups?.map((g) => ({
                    type: g.type || '',
                    tests: (g.tests || []).map((t) => ({
                        code: t.code || '',
                        quantity: t.quantity || 1,
                        name: t.name
                    }))
                })) || [emptyTestGroup()];
            if (testGroups.length === 0) testGroups.push(emptyTestGroup());
            setForm({
                isSpecialCase: caseData.isSpecialCase ?? false,
                documentType: caseData.documentType || '',
                patientDocument: caseData.patientDocument || '',
                ...names,
                entityCode: caseData.entityCode || '',
                entityName: caseData.entityName || caseData.institution || '',
                numberOfPlates: caseData.numberOfPlates ?? 1,
                notes: caseData.notes || '',
                testGroups,
                status: caseData.status || 'En proceso'
            });
        } else if (isOpen) {
            setForm({
                isSpecialCase: false,
                documentType: '',
                patientDocument: '',
                firstName: '',
                secondName: '',
                firstLastName: '',
                secondLastName: '',
                entityCode: '',
                entityName: '',
                numberOfPlates: 1,
                notes: '',
                testGroups: [emptyTestGroup()],
                status: 'En proceso'
            });
            setErrors({});
        }
    }, [caseData, isOpen]);

    const handleEntitySelected = (code: string, name: string) => {
        setForm((p) => ({ ...p, entityCode: code, entityName: name }));
    };

    const addTestGroup = () => {
        setForm((p) => ({ ...p, testGroups: [...p.testGroups, emptyTestGroup()] }));
    };

    const removeTestGroup = (idx: number) => {
        setForm((p) => ({
            ...p,
            testGroups: p.testGroups.length > 1 ? p.testGroups.filter((_, i) => i !== idx) : [emptyTestGroup()]
        }));
    };

    const addTestToGroup = (groupIdx: number) => {
        setForm((p) => {
            const groups = [...p.testGroups];
            groups[groupIdx] = { ...groups[groupIdx], tests: [...groups[groupIdx].tests, emptyTestItem()] };
            return { ...p, testGroups: groups };
        });
    };

    const removeTestFromGroup = (groupIdx: number, testIdx: number) => {
        setForm((p) => {
            const groups = [...p.testGroups];
            const tests = groups[groupIdx].tests.filter((_, i) => i !== testIdx);
            groups[groupIdx] = { ...groups[groupIdx], tests };
            return { ...p, testGroups: groups };
        });
    };

    const updateTestGroup = (groupIdx: number, field: 'type' | 'tests', value: string | TestItem[]) => {
        setForm((p) => {
            const groups = [...p.testGroups];
            groups[groupIdx] = { ...groups[groupIdx], [field]: value };
            if (field === 'type' && typeof value === 'string' && value && groups[groupIdx].tests.length === 0) {
                groups[groupIdx].tests = [emptyTestItem()];
            }
            if (field === 'type' && typeof value === 'string' && !value) {
                groups[groupIdx].tests = [];
            }
            return { ...p, testGroups: groups };
        });
    };

    const updateTestInGroup = (groupIdx: number, testIdx: number, field: keyof TestItem, value: string | number) => {
        setForm((p) => {
            const groups = [...p.testGroups];
            const tests = [...groups[groupIdx].tests];
            tests[testIdx] = { ...tests[testIdx], [field]: value };
            groups[groupIdx] = { ...groups[groupIdx], tests };
            return { ...p, testGroups: groups };
        });
    };

    const validateForm = (): boolean => {
        const err: Record<string, string> = {};
        if (!form.entityCode?.trim()) err.entityCode = 'La entidad es obligatoria';
        form.testGroups.forEach((g, gi) => {
            if (g.tests.length > 0 || g.type) {
                if (!g.type) err[`testGroup_${gi}_type`] = 'El tipo de prueba es obligatorio';
                g.tests.forEach((t, ti) => {
                    if (!t.code?.trim()) err[`testGroup_${gi}_test_${ti}_code`] = 'La prueba es obligatoria';
                    if (!t.quantity || t.quantity <= 0) err[`testGroup_${gi}_test_${ti}_quantity`] = 'La cantidad es obligatoria';
                });
            }
        });
        const hasValidGroup = form.testGroups.some(
            (g) => g.type && g.tests.length > 0 && g.tests.every((t) => t.code?.trim() && t.quantity > 0)
        );
        if (!hasValidGroup) err.tests = 'Debe agregar al menos un tipo de prueba con pruebas validas';
        setErrors(err);
        return Object.keys(err).length === 0;
    };

    const buildCreatePayload = (): UnreadCaseCreatePayload => {
        const patientName = form.isSpecialCase
            ? 'Caso Especial'
            : [form.firstName, form.secondName, form.firstLastName, form.secondLastName].filter(Boolean).join(' ');

        const testGroups: TestGroup[] = form.testGroups
            .filter((g) => g.type && g.tests.length > 0)
            .map((g) => ({
                type: g.type as TestGroup['type'],
                tests: g.tests.filter((t) => t.code && t.quantity > 0).map((t) => ({ code: t.code, quantity: t.quantity, name: t.name }))
            }));

        return {
            caseCode: undefined as unknown as string,
            isSpecialCase: form.isSpecialCase,
            documentType: form.isSpecialCase ? undefined : form.documentType || undefined,
            patientDocument: form.isSpecialCase ? undefined : form.patientDocument.trim() || undefined,
            patientName: patientName || undefined,
            entityCode: form.entityCode,
            entityName: form.entityName,
            institution: form.entityName,
            numberOfPlates: form.numberOfPlates,
            notes: form.notes.trim() || undefined,
            testGroups: testGroups.length > 0 ? testGroups : undefined,
            entryDate: new Date().toISOString(),
            receivedBy: user?.name || user?.email || undefined,
            status: form.status
        };
    };

    const buildUpdatePayload = (): UnreadCaseUpdatePayload => {
        const patientName = form.isSpecialCase
            ? 'Caso Especial'
            : [form.firstName, form.secondName, form.firstLastName, form.secondLastName].filter(Boolean).join(' ');

        const testGroups: TestGroup[] = form.testGroups
            .filter((g) => g.type && g.tests.length > 0)
            .map((g) => ({
                type: g.type as TestGroup['type'],
                tests: g.tests.filter((t) => t.code && t.quantity > 0).map((t) => ({ code: t.code, quantity: t.quantity, name: t.name }))
            }));

        return {
            isSpecialCase: form.isSpecialCase,
            documentType: form.isSpecialCase ? undefined : form.documentType || undefined,
            patientDocument: form.isSpecialCase ? undefined : form.patientDocument.trim() || undefined,
            patientName: patientName || undefined,
            entityCode: form.entityCode,
            entityName: form.entityName,
            institution: form.entityName,
            numberOfPlates: form.numberOfPlates,
            notes: form.notes.trim() || undefined,
            testGroups: testGroups.length > 0 ? testGroups : undefined,
            status: form.status
        };
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            if (isEditMode && onUpdate) {
                await onUpdate(buildUpdatePayload());
            } else if (!isEditMode && onCreate) {
                await onCreate(buildCreatePayload());
            }
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (isEditMode) return;
        setForm({
            isSpecialCase: false,
            documentType: '',
            patientDocument: '',
            firstName: '',
            secondName: '',
            firstLastName: '',
            secondLastName: '',
            entityCode: '',
            entityName: '',
            numberOfPlates: 1,
            notes: '',
            testGroups: [emptyTestGroup()],
            status: 'En proceso'
        });
        setErrors({});
    };

    const handleSpecialCaseChange = (checked: boolean) => {
        setForm((p) => ({
            ...p,
            isSpecialCase: checked,
            ...(checked
                ? {
                      documentType: '',
                      patientDocument: '',
                      firstName: '',
                      secondName: '',
                      firstLastName: '',
                      secondLastName: ''
                  }
                : {})
        }));
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                        <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-neutral-900">
                            {isEditMode ? `Editar caso ${caseData?.caseCode}` : 'Nuevo caso sin lectura'}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                            {isEditMode
                                ? 'Modifique los datos del caso'
                                : 'Complete los datos del nuevo registro - Se generara codigo automaticamente (ej: UR2026-00001)'}
                        </p>
                    </div>
                </div>
            }
            size="4xl"
            footer={
                <div className="flex justify-end gap-3">
                    {!isEditMode && <ClearButton text="Limpiar" size="sm" onClick={handleReset} />}
                    <BaseButton variant="secondary" size="sm" onClick={onClose}>
                        Cancelar
                    </BaseButton>
                    <SaveButton text="Guardar" size="sm" loading={saving} onClick={handleSubmit} />
                </div>
            }
        >
            <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-1">
                {/* Informacion del Paciente */}
                <section className="rounded-xl border border-neutral-200 bg-neutral-50 shadow-sm overflow-hidden">
                    <div className="border-b border-neutral-200 bg-white px-6 py-4">
                        <div className="flex items-start gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 mt-0.5">
                                <UserCircle className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
                                    Informacion del Paciente
                                </h4>
                                <p className="text-xs text-neutral-500 mt-0.5">Datos personales del paciente</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="mb-6 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3">
                            <BaseCheckbox
                                id="specialCase"
                                checked={form.isSpecialCase}
                                onChange={(e) => handleSpecialCaseChange(e.target.checked)}
                                label="Caso especial (laboratorio externo, sin datos de paciente)"
                            />
                        </div>

                        {!form.isSpecialCase ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormField label="Tipo de Documento">
                                    <Select
                                        value={form.documentType}
                                        onChange={(e) => setForm((p) => ({ ...p, documentType: e.target.value }))}
                                        options={DOCUMENT_TYPE_OPTIONS}
                                    />
                                </FormField>
                                <FormField label="Documento">
                                    <Input
                                        placeholder="Ej: 70900325"
                                        value={form.patientDocument}
                                        onChange={(e) => setForm((p) => ({ ...p, patientDocument: e.target.value }))}
                                        maxLength={15}
                                    />
                                </FormField>
                                <FormField label="Primer Nombre">
                                    <Input
                                        placeholder="Ej: FRANCISCO"
                                        value={form.firstName}
                                        onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                                        maxLength={50}
                                    />
                                </FormField>
                                <FormField label="Segundo Nombre">
                                    <Input
                                        placeholder="Ej: JAVIER"
                                        value={form.secondName}
                                        onChange={(e) => setForm((p) => ({ ...p, secondName: e.target.value }))}
                                        maxLength={50}
                                    />
                                </FormField>
                                <FormField label="Primer Apellido">
                                    <Input
                                        placeholder="Ej: ARBELAEZ"
                                        value={form.firstLastName}
                                        onChange={(e) => setForm((p) => ({ ...p, firstLastName: e.target.value }))}
                                        maxLength={50}
                                    />
                                </FormField>
                                <FormField label="Segundo Apellido">
                                    <Input
                                        placeholder="Ej: GOMEZ"
                                        value={form.secondLastName}
                                        onChange={(e) => setForm((p) => ({ ...p, secondLastName: e.target.value }))}
                                        maxLength={50}
                                    />
                                </FormField>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 py-2 text-center text-sm italic text-neutral-500">
                                No se requieren datos del paciente para casos especiales
                            </div>
                        )}
                    </div>
                </section>

                {/* Detalles del Caso */}
                <section className="rounded-xl border border-neutral-200 bg-neutral-50 shadow-sm overflow-hidden">
                    <div className="border-b border-neutral-200 bg-white px-6 py-4">
                        <div className="flex items-start gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 mt-0.5">
                                <FileText className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-900">
                                    Detalles del Caso
                                </h4>
                                <p className="text-xs text-neutral-500 mt-0.5">Entidad, placas, pruebas y observaciones</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField label="Entidad" required error={errors.entityCode} className="md:col-span-2">
                                <EntitiesCombobox
                                    value={form.entityCode}
                                    onChange={(v) => setForm((p) => ({ ...p, entityCode: v }))}
                                    onEntitySelected={handleEntitySelected}
                                    placeholder="Buscar y seleccionar entidad..."
                                />
                            </FormField>
                            <FormField label="Numero de Placas">
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.numberOfPlates}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, numberOfPlates: parseInt(e.target.value) || 1 }))
                                    }
                                />
                            </FormField>
                        </div>

                        {/* Pruebas a Realizar */}
                        <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h5 className="text-sm font-semibold text-neutral-800">Tipos de prueba</h5>
                            <BaseButton
                                variant="tertiary"
                                size="sm"
                                onClick={addTestGroup}
                                startIcon={<Plus className="h-4 w-4" />}
                            >
                                Agregar tipo de prueba
                            </BaseButton>
                        </div>
                        {errors.tests && <p className="text-xs text-red-600">{errors.tests}</p>}
                        {form.testGroups.map((group, groupIdx) => (
                            <div
                                key={groupIdx}
                                className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm space-y-3"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <FormField label={`Tipo de prueba #${groupIdx + 1}`} required error={errors[`testGroup_${groupIdx}_type`]}>
                                            <Select
                                                value={group.type}
                                                onChange={(e) =>
                                                    updateTestGroup(groupIdx, 'type', e.target.value)
                                                }
                                                options={TEST_TYPE_OPTIONS}
                                                placeholder="Seleccione el tipo de prueba"
                                            />
                                        </FormField>
                                    </div>
                                    {form.testGroups.length > 1 && (
                                        <BaseButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeTestGroup(groupIdx)}
                                            className="mt-6 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </BaseButton>
                                    )}
                                </div>

                                {group.type && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                                                Pruebas
                                            </span>
                                            <BaseButton
                                                variant="tertiary"
                                                size="sm"
                                                onClick={() => addTestToGroup(groupIdx)}
                                                startIcon={<Plus className="h-4 w-4" />}
                                            >
                                                Agregar prueba
                                            </BaseButton>
                                        </div>
                                        <div className="space-y-2">
                                            {group.tests.map((test, testIdx) => (
                                                <div
                                                    key={testIdx}
                                                    className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_40px] items-end"
                                                >
                                                    <FormField
                                                        label={`Prueba #${testIdx + 1}`}
                                                        required
                                                        error={errors[`testGroup_${groupIdx}_test_${testIdx}_code`]}
                                                    >
                                                        <TestsCombobox
                                                            value={test.code}
                                                            onChange={(v) =>
                                                                updateTestInGroup(groupIdx, testIdx, 'code', v)
                                                            }
                                                            onTestSelected={(code, name) =>
                                                                updateTestInGroup(groupIdx, testIdx, 'name', name)
                                                            }
                                                            placeholder={`Buscar prueba ${testIdx + 1}...`}
                                                        />
                                                    </FormField>
                                                    <FormField label="Cantidad" required error={errors[`testGroup_${groupIdx}_test_${testIdx}_quantity`]}>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            value={test.quantity}
                                                            onChange={(e) =>
                                                                updateTestInGroup(
                                                                    groupIdx,
                                                                    testIdx,
                                                                    'quantity',
                                                                    parseInt(e.target.value) || 1
                                                                )
                                                            }
                                                        />
                                                    </FormField>
                                                    <div className="flex items-center justify-center pb-2">
                                                        <BaseButton
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeTestFromGroup(groupIdx, testIdx)}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </BaseButton>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        </div>

                        <FormField label="Observaciones generales" className="md:col-span-2">
                            <Textarea
                                placeholder="Notas adicionales sobre el caso"
                                rows={2}
                                maxLength={500}
                                value={form.notes}
                                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                            />
                        </FormField>
                    </div>
                </section>
            </div>
        </BaseModal>
    );
}
