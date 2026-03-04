'use client';

import { useState, useEffect, useCallback } from 'react';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton, BaseCheckbox } from '@/shared/components/base';
import { FormField, Input, Textarea } from '@/shared/components/ui/form';
import { entitiesService } from '../services/entities.service';
import type { CreateEntityRequest } from '../types/entity.types';

interface EntityFormState {
    name: string;
    code: string;
    observations: string;
    isActive: boolean;
}

const INITIAL_FORM: EntityFormState = {
    name: '',
    code: '',
    observations: '',
    isActive: true,
};

function validateForm(data: EntityFormState): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!data.name?.trim()) errors.name = 'El nombre es obligatorio';
    if (!data.code?.trim()) errors.code = 'El codigo es obligatorio';
    else if (!/^[A-Z0-9_-]+$/i.test(data.code)) {
        errors.code = 'Solo letras, numeros, guiones y guiones bajos';
    }
    return errors;
}

interface CreateEntityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export function CreateEntityModal({ isOpen, onClose, onSave }: CreateEntityModalProps) {
    const [form, setForm] = useState<EntityFormState>({ ...INITIAL_FORM });
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

    const update = useCallback((field: keyof EntityFormState, value: string | boolean) => {
        setForm((p) => ({ ...p, [field]: value }));
        setErrors((e) => {
            const next = { ...e };
            delete next[field];
            return next;
        });
        if (field === 'code') setCodeCheckError('');
    }, []);

    const checkCode = useCallback(async () => {
        if (!form.code?.trim()) return;
        setCodeCheckError('');
        try {
            const exists = await entitiesService.checkCodeExists(form.code.trim());
            if (exists) setCodeCheckError('Este codigo ya esta en uso');
        } catch {
            setCodeCheckError('Error al verificar el codigo');
        }
    }, [form.code]);

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
            const payload: CreateEntityRequest = {
                name: form.name.trim(),
                code: form.code.trim().toUpperCase(),
                observations: form.observations.trim() || undefined,
                is_active: form.isActive,
            };
            await entitiesService.create(payload);
            onSave();
            onClose();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al guardar la entidad';
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
            title="Nueva entidad"
            size="lg"
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
                    <FormField label="Nombre de la entidad" error={errors.name} htmlFor="modal-entityName">
                        <Input
                            id="modal-entityName"
                            placeholder="Ej. Hospital Alma Mater"
                            value={form.name}
                            onChange={(e) => update('name', e.target.value)}
                        />
                    </FormField>
                    <FormField label="Codigo" error={errors.code || codeCheckError} htmlFor="modal-entityCode">
                        <Input
                            id="modal-entityCode"
                            placeholder="Ej. HAMA-001"
                            value={form.code}
                            onChange={(e) => update('code', e.target.value)}
                            onBlur={checkCode}
                        />
                    </FormField>
                </div>
                <FormField label="Observaciones" htmlFor="modal-observations">
                    <Textarea
                        id="modal-observations"
                        placeholder="Notas relevantes (opcional)"
                        rows={3}
                        value={form.observations}
                        onChange={(e) => update('observations', e.target.value)}
                    />
                </FormField>
                <BaseCheckbox
                    label="Entidad activa"
                    checked={form.isActive}
                    onChange={(e) => update('isActive', e.target.checked)}
                />
                {errors.submit && (
                    <div className="text-sm font-medium text-red-600">{errors.submit}</div>
                )}
            </form>
        </BaseModal>
    );
}
