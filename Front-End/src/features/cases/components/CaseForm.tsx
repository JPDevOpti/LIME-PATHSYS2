'use client';

import { useState, useEffect } from 'react';
import { BaseCard } from '@/shared/components/base/BaseCard';
import { FormField, Input, Select, Textarea, FormErrorAlert } from '@/shared/components/ui/form';
import { ClearButton, SaveButton, DeleteButton } from '@/shared/components/ui/buttons';
import { Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/overlay/ConfirmDialog';
import { CreateCaseRequest, UpdateCaseRequest, Case, CasePriority, CaseStatus, SampleInfo, TestInfo } from '../types/case.types';
import { BodyRegionCombobox, PathologistsCombobox, TestsCombobox, EntitiesCombobox } from '@/shared/components/lists';
import { patientService } from '../../patients/services/patient.service';
import { CareType } from '../../patients/types/patient.types';

const PRIORITY_OPTIONS = [
    { value: 'normal', label: 'Normal' },
    { value: 'prioritario', label: 'Prioritario' }
];

const CASE_STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
    { value: 'En recepción', label: 'En recepción' },
    { value: 'Corte macro', label: 'Corte macro' },
    { value: 'Descrip micro', label: 'Descrip micro' },
    { value: 'Por firmar', label: 'Por firmar' },
    { value: 'Por entregar', label: 'Por entregar' },
    { value: 'Completado', label: 'Completado' }
];

const createEmptyTest = (): TestInfo => ({ id: '', test_code: '', name: '', quantity: 1 });
const createEmptySample = (): SampleInfo => ({ body_region: '', tests: [createEmptyTest()] });

const INITIAL_FORM_DATA: Omit<CreateCaseRequest, 'patientId'> = {
    priority: '' as CasePriority,
    doctor: '',
    service: '',
    previous_study: false,
    observations: '',
    entity: { id: '', name: '' },
    care_type: '' as CareType,
    numberOfSamples: 1,
    samples: [createEmptySample()],
    max_opportunity_time: 0
};

interface CaseFormCreateProps {
    patientId: string;
    onSubmit: (data: CreateCaseRequest) => Promise<void>;
    onClear?: () => void;
}

interface CaseFormEditProps {
    initialData: Case;
    onSubmit: (data: UpdateCaseRequest) => Promise<void>;
    onClear?: () => void;
    onDelete?: () => void | Promise<void>;
}

function getStatusStyles(status?: CaseStatus): string {
    switch (status) {
        case 'Completado': return 'bg-green-100 text-green-800 border-green-200';
        case 'Por entregar': return 'bg-red-100 text-red-800 border-red-200';
        case 'Por firmar': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'Descrip micro': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        case 'Corte macro': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
        case 'En recepción': return 'bg-blue-100 text-blue-800 border-blue-200';
        default: return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
}

function caseToFormData(c: Case): CreateCaseRequest & { assigned_pathologist?: { id: string; name: string }; status?: CaseStatus } {
    return {
        patientId: c.patient?.id || '',
        priority: c.priority?.toLowerCase() as CasePriority,
        doctor: c.doctor,
        service: c.service,
        previous_study: c.previous_study,
        observations: c.observations || '',
        numberOfSamples: c.samples?.length || 1,
        samples: c.samples?.length ? c.samples.map(s => ({
            body_region: s.body_region,
            tests: s.tests?.map(t => ({ id: t.id || '', test_code: t.test_code, name: t.name, quantity: t.quantity || 1 })) || [createEmptyTest()]
        })) : [createEmptySample()],
        assigned_pathologist: c.assigned_pathologist,
        status: c.status,
        max_opportunity_time: c.opportunity_info?.[0]?.max_opportunity_time,
        entity: c.entity,
        care_type: c.patient?.care_type
    };
}

export function CaseForm(props: CaseFormCreateProps | CaseFormEditProps) {
    const isEdit = 'initialData' in props;
    const initialFormData = isEdit
        ? caseToFormData((props as CaseFormEditProps).initialData)
        : { ...INITIAL_FORM_DATA, patientId: (props as CaseFormCreateProps).patientId, status: 'En recepción' as CaseStatus };

    const [formData, setFormData] = useState<CreateCaseRequest & Partial<Pick<UpdateCaseRequest, 'assigned_pathologist' | 'status'>>>(initialFormData);
    const [samplesInput, setSamplesInput] = useState(String(initialFormData.numberOfSamples ?? 1));
    const [isLoading, setIsLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<{ message: string; type: 'validation' | 'submit'; field?: string; errors?: Array<{ field: string; message: string }> } | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const allTests = formData.samples.flatMap(s => s.tests);
        const times = allTests.map(t => t.time || 0).filter(t => t > 0);
        const maxTime = times.length > 0 ? Math.max(...times) : 0;

        if (formData.max_opportunity_time !== maxTime) {
            setFormData(prev => ({ ...prev, max_opportunity_time: maxTime }));
        }
    }, [formData.samples]);

    useEffect(() => {
        if (!isEdit && formData.patientId) {
            patientService.getPatientById(formData.patientId).then(patient => {
                if (patient) {
                    setFormData(prev => ({
                        ...prev,
                        entity: { id: '', name: patient.entity_info?.entity_name || '' },
                        care_type: patient.care_type
                    }));
                }
            });
        }
    }, [isEdit, formData.patientId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target;
        const name = target.name;
        const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
        setFormData(prev => ({ ...prev, [name]: name === 'priority' ? value as CasePriority : name === 'status' ? value as CaseStatus : value }));
        if (error) setError(null);
        if (name === 'doctor' && fieldErrors.doctor) setFieldErrors(prev => ({ ...prev, doctor: false }));
        if (name === 'priority' && fieldErrors.priority) setFieldErrors(prev => ({ ...prev, priority: false }));
        if (name === 'care_type' && fieldErrors.care_type) setFieldErrors(prev => ({ ...prev, care_type: false }));
    };

    const syncSamples = (num: number) => {
        setFormData(prev => {
            const samples = [...prev.samples];
            if (num > samples.length) {
                while (samples.length < num) samples.push(createEmptySample());
            } else if (num < samples.length) {
                samples.length = num;
            }
            return { ...prev, numberOfSamples: num, samples };
        });
        if (error) setError(null);
        setFieldErrors({});
    };

    const handleNumberOfSamplesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setSamplesInput(raw);
        const parsed = parseInt(raw);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
            syncSamples(parsed);
        }
    };

    const handleNumberOfSamplesBlur = () => {
        const parsed = parseInt(samplesInput);
        const valid = !isNaN(parsed) && parsed >= 1 && parsed <= 10
            ? parsed
            : formData.numberOfSamples;
        setSamplesInput(String(valid));
        syncSamples(valid);
    };

    const handleSampleBodyRegionChange = (sampleIndex: number, value: string) => {
        setFormData(prev => {
            const samples = [...prev.samples];
            if (samples[sampleIndex]) {
                samples[sampleIndex] = { ...samples[sampleIndex], body_region: value };
            }
            return { ...prev, samples };
        });
    };

    const handleTestChange = (sampleIndex: number, testIndex: number, field: 'test_code' | 'quantity', value: string | number) => {
        setFormData(prev => {
            const samples = prev.samples.map((s, i) => {
                if (i !== sampleIndex) return s;
                const tests = s.tests.map((t, j) => {
                    if (j !== testIndex) return t;
                    if (field === 'test_code') {
                        return { ...t, test_code: String(value), name: String(value) || t.name };
                    }
                    return { ...t, quantity: value === '' ? 0 : Math.max(0, Number(value)) };
                });
                return { ...s, tests };
            });
            return { ...prev, samples };
        });
        if (field === 'test_code') {
            setFieldErrors(prev => {
                const next = { ...prev };
                Object.keys(next).filter(k => k.startsWith(`sample_${sampleIndex}_test_`)).forEach(k => delete next[k]);
                return next;
            });
        }
    };

    const handleTestQuantityBlur = (sampleIndex: number, testIndex: number) => {
        setFormData(prev => {
            const samples = prev.samples.map((s, i) => {
                if (i !== sampleIndex) return s;
                const tests = s.tests.map((t, j) => {
                    if (j !== testIndex) return t;
                    return { ...t, quantity: t.quantity < 1 || isNaN(t.quantity) ? 1 : t.quantity };
                });
                return { ...s, tests };
            });
            return { ...prev, samples };
        });
    };

    const handleTestSelected = (sampleIndex: number, testIndex: number, test_code: string, name: string, time?: number, id?: string) => {
        setFormData(prev => {
            const samples = prev.samples.map((s, i) => {
                if (i !== sampleIndex) return s;
                const tests = s.tests.map((t, j) => {
                    if (j !== testIndex) return t;
                    return { ...t, id: id || '', test_code, name: name || test_code, time };
                });
                return { ...s, tests };
            });
            return { ...prev, samples };
        });

        setFieldErrors(prev => {
            const next = { ...prev };
            delete next[`sample_${sampleIndex}_test_${testIndex}`];
            return next;
        });
    };

    const addTest = (sampleIndex: number) => {
        setFormData(prev => {
            const samples = [...prev.samples];
            if (samples[sampleIndex]) {
                samples[sampleIndex] = {
                    ...samples[sampleIndex],
                    tests: [...samples[sampleIndex].tests, createEmptyTest()]
                };
            }
            return { ...prev, samples };
        });
    };

    const removeTest = (sampleIndex: number, testIndex: number) => {
        setFormData(prev => {
            const samples = prev.samples.map((s, i) => {
                if (i !== sampleIndex) return s;
                if (s.tests.length <= 1) return s;
                const tests = s.tests.filter((_, j) => j !== testIndex);
                return { ...s, tests };
            });
            return { ...prev, samples };
        });
    };

    const validate = (): boolean => {
        const errors: Record<string, boolean> = {};
        const errorItems: Array<{ field: string; message: string }> = [];
        if (!formData.doctor?.trim()) {
            errors.doctor = true;
            errorItems.push({ field: 'Médico remitente', message: 'Requerido' });
        }
        if (!formData.priority?.trim()) {
            errors.priority = true;
            errorItems.push({ field: 'Prioridad', message: 'Requerido' });
        }
        for (let i = 0; i < formData.samples.length; i++) {
            const s = formData.samples[i];
            if (!s.body_region?.trim()) {
                errors[`sample_${i}_body_region`] = true;
                errorItems.push({ field: `Muestra ${i + 1} - Región del cuerpo`, message: 'Requerido' });
            }
            if (!s.tests.length || s.tests.every(t => !t.test_code?.trim())) {
                errors[`sample_${i}_test_0`] = true;
                errorItems.push({ field: `Muestra ${i + 1} - Pruebas`, message: 'Al menos una prueba requerida' });
            }
        }
        setFieldErrors(errors);
        if (errorItems.length > 0) {
            setError({
                message: 'Los siguientes campos tienen errores o están incompletos:',
                type: 'validation',
                errors: errorItems
            });
            return false;
        }
        return true;
    };

    const sanitizeCasePayload = <T extends Record<string, any>>(data: T): T => {
        const optionalStrFields = ['service', 'observations'] as const;
        const out: any = { ...data };
        for (const field of optionalStrFields) {
            if (out[field] === '') out[field] = null;
        }
        if (out.entity && !out.entity.name) out.entity = null;
        return out;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            if (isEdit) {
                const { patientId: _, ...updateData } = formData;
                await (props as CaseFormEditProps).onSubmit(sanitizeCasePayload(updateData));
            } else {
                await (props as CaseFormCreateProps).onSubmit({ ...formData, patientId: (props as CaseFormCreateProps).patientId });
            }
        } catch (err: unknown) {
            setError({ message: 'Error al guardar el caso', type: 'submit' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        if (isEdit) {
            setFormData(caseToFormData((props as CaseFormEditProps).initialData));
        } else {
            setFormData({
                ...INITIAL_FORM_DATA,
                patientId: (props as CaseFormCreateProps).patientId,
                samples: Array.from({ length: INITIAL_FORM_DATA.numberOfSamples }, createEmptySample),
                status: 'En recepción' as CaseStatus
            });
        }
        setError(null);
        setFieldErrors({});
        props.onClear?.();
    };

    return (
        <BaseCard variant="default" padding="lg">
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3 -mt-2 -mx-6 px-6">
                    <h3 className="text-lg font-bold text-neutral-900">
                        Información del Caso
                    </h3>
                    {isEdit && formData.status && (() => {
                        const currentIdx = CASE_STATUS_OPTIONS.findIndex(o => o.value === (props as CaseFormEditProps).initialData.status);
                        const availableOptions = CASE_STATUS_OPTIONS.filter((_, i) => i <= currentIdx);
                        return (
                            <div className="relative">
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as CaseStatus }))}
                                    className={`appearance-none cursor-pointer pl-3 pr-7 py-1 rounded-full text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-lime-brand-500 ${getStatusStyles(formData.status)}`}
                                >
                                    {availableOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        );
                    })()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <FormField label="Entidad">
                        <EntitiesCombobox
                            value={formData.entity?.name || ''}
                            onChange={(v) => {
                                setFormData(prev => ({ ...prev, entity: { id: '', name: v } }));
                            }}
                            onEntitySelected={(_code, name, id) => {
                                setFormData(prev => ({ ...prev, entity: { id: id || '', name } }));
                            }}
                            placeholder="Buscar entidad..."
                        />
                    </FormField>

                    <FormField label="Tipo de atención">
                        <Select
                            name="care_type"
                            value={formData.care_type || ''}
                            onChange={handleChange}
                            options={[
                                { label: 'Seleccionar tipo', value: '' },
                                { label: 'Ambulatorio', value: 'Ambulatorio' },
                                { label: 'Hospitalizado', value: 'Hospitalizado' }
                            ]}
                        />
                    </FormField>

                    <FormField label="Servicio">
                        <Input
                            type="text"
                            name="service"
                            value={formData.service}
                            onChange={handleChange}
                            placeholder="Ej: Dermatología"
                        />
                    </FormField>

                    <FormField label="Prioridad" required>
                        <Select
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            options={[
                                { label: 'Seleccione prioridad', value: '' },
                                ...PRIORITY_OPTIONS
                            ]}
                            placeholder="Seleccione prioridad"
                            error={fieldErrors.priority ? ' ' : undefined}
                        />
                    </FormField>

                    <FormField label="Médico remitente" required>
                        <Input
                            type="text"
                            name="doctor"
                            value={formData.doctor}
                            onChange={handleChange}
                            placeholder="Nombre del médico remitente"
                            required
                            error={fieldErrors.doctor ? ' ' : undefined}
                        />
                    </FormField>

                    <FormField label="Patólogo asignado">
                        <PathologistsCombobox
                            value={formData.assigned_pathologist?.id ?? ''}
                            onChange={(v) => {
                                if (!v) {
                                    setFormData(prev => ({ ...prev, assigned_pathologist: undefined }));
                                    return;
                                }
                                setFormData(prev => ({
                                    ...prev,
                                    assigned_pathologist: prev.assigned_pathologist?.id === v
                                        ? prev.assigned_pathologist
                                        : { id: v, name: prev.assigned_pathologist?.name || '' }
                                }));
                            }}
                            onPathologistSelected={(id, name) => {
                                setFormData(prev => ({
                                    ...prev,
                                    assigned_pathologist: { id, name }
                                }));
                            }}
                            placeholder="Buscar patólogo..."
                        />
                    </FormField>

                    <FormField label="Número de muestras">
                        <Input
                            type="number"
                            name="numberOfSamples"
                            min={1}
                            max={10}
                            value={samplesInput}
                            onChange={handleNumberOfSamplesChange}
                            onBlur={handleNumberOfSamplesBlur}
                        />
                    </FormField>

                    <FormField label="Tiempo de oportunidad">
                        <Input
                            type="number"
                            name="max_opportunity_time"
                            min={0}
                            max={30}
                            value={formData.max_opportunity_time ?? ''}
                            onChange={handleChange}
                            placeholder="Ej: 6"
                        />
                    </FormField>
                </div>

                {formData.samples.length > 0 && (
                    <div className="space-y-4">
                        <h4 className="text-base font-semibold text-neutral-800">
                            Información de Muestras
                        </h4>
                        {formData.samples.map((sample, sampleIndex) => (
                            <div
                                key={sampleIndex}
                                className="border border-neutral-200 rounded-lg p-4 bg-neutral-50"
                            >
                                <h5 className="font-medium text-neutral-700 mb-4">
                                    Muestra #{sampleIndex + 1}
                                </h5>
                                <div className="space-y-4">
                                    <FormField label="Región del cuerpo">
                                        <BodyRegionCombobox
                                            value={sample.body_region}
                                            onChange={(v) => handleSampleBodyRegionChange(sampleIndex, v)}
                                            placeholder="Buscar región del cuerpo..."
                                            error={fieldErrors[`sample_${sampleIndex}_body_region`] ? ' ' : undefined}
                                        />
                                    </FormField>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-neutral-700">Pruebas a realizar</label>
                                            <button
                                                type="button"
                                                onClick={() => addTest(sampleIndex)}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white border border-neutral-300 text-lime-brand-600 hover:bg-neutral-50 rounded-lg shadow-sm transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Agregar prueba
                                            </button>
                                        </div>
                                        {sample.tests.map((test, testIndex) => (
                                            <div
                                                key={testIndex}
                                                className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-end"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <FormField label={`Prueba #${testIndex + 1}`}>
                                                        <TestsCombobox
                                                            value={test.test_code}
                                                            onChange={(v) => handleTestChange(sampleIndex, testIndex, 'test_code', v)}
                                                            onTestSelected={(code, name, time, id) => handleTestSelected(sampleIndex, testIndex, code, name, time, id)}
                                                            extraOptions={sample.tests.map((t) => ({ code: t.test_code, name: t.name || t.test_code }))}
                                                            placeholder={`Buscar prueba ${testIndex + 1}...`}
                                                            error={fieldErrors[`sample_${sampleIndex}_test_${testIndex}`] ? ' ' : undefined}
                                                        />
                                                    </FormField>
                                                </div>
                                                <div className="w-full sm:w-24">
                                                    <FormField label="Cantidad">
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            value={test.quantity === 0 ? '' : test.quantity}
                                                            onChange={(e) => handleTestChange(sampleIndex, testIndex, 'quantity', e.target.value)}
                                                            onBlur={() => handleTestQuantityBlur(sampleIndex, testIndex)}
                                                        />
                                                    </FormField>
                                                </div>
                                                <div className="flex items-center sm:pb-0 pb-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTest(sampleIndex, testIndex)}
                                                        disabled={sample.tests.length <= 1}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                        title="Eliminar prueba"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <FormField label="Observaciones">
                    <Textarea
                        name="observations"
                        value={formData.observations}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Observaciones del caso..."
                    />
                </FormField>

                {error && (
                    <FormErrorAlert message={error.message} type={error.type} field={error.field} errors={error.errors} />
                )}

                <div className="flex flex-wrap justify-end items-center gap-3 pt-4 border-t border-neutral-200" dir="ltr">
                    <ClearButton onClick={handleClear} text="Limpiar" />
                    {isEdit && (props as CaseFormEditProps).onDelete && (
                        <DeleteButton
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isLoading}
                            text="Borrar"
                        />
                    )}
                    <SaveButton loading={isLoading} disabled={isLoading}>
                        {isEdit ? 'Actualizar Caso' : 'Guardar Caso'}
                    </SaveButton>
                </div>
            </form>

            {isEdit && (props as CaseFormEditProps).onDelete && (
                <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    title="Borrar caso"
                    message="¿Está seguro que desea eliminar este caso? Esta acción no se puede deshacer."
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    variant="danger"
                    loading={isDeleting}
                    onConfirm={async () => {
                        setIsDeleting(true);
                        try {
                            await (props as CaseFormEditProps).onDelete?.();
                            setShowDeleteConfirm(false);
                        } finally {
                            setIsDeleting(false);
                        }
                    }}
                />
            )}
        </BaseCard>
    );
}
