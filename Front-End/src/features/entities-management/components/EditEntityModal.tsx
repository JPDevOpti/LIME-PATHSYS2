'use client';

import { useState, useEffect, useCallback } from 'react';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton, BaseCheckbox } from '@/shared/components/base';
import { FormField, Input, Textarea } from '@/shared/components/ui/form';
import { entitiesService } from '../services/entities.service';
import type { Entity, UpdateEntityRequest } from '../types/entity.types';

function validateForm(data: { code: string; name: string }): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!data.code?.trim()) errors.code = 'El codigo es obligatorio';
    else if (!/^[A-Za-z0-9_-]+$/.test(data.code.trim())) errors.code = 'Solo letras, numeros, guiones y guiones bajos';
    if (!data.name?.trim()) errors.name = 'El nombre es obligatorio';
    return errors;
}

interface EditEntityModalProps {
    entity: Entity | null;
    onClose: () => void;
    onSave: () => void;
}

export function EditEntityModal({ entity, onClose, onSave }: EditEntityModalProps) {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [observations, setObservations] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (entity) {
            setCode(entity.code);
            setName(entity.name);
            setObservations(entity.observations ?? '');
            setIsActive(entity.is_active);
            setErrors({});
        }
    }, [entity]);

    const update = useCallback((field: string, value: string | boolean) => {
        if (field === 'code') setCode(value as string);
        if (field === 'name') setName(value as string);
        if (field === 'observations') setObservations(value as string);
        if (field === 'isActive') setIsActive(value as boolean);
        setErrors((e) => {
            const next = { ...e };
            delete next[field];
            return next;
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!entity) return;
        const data = { code, name };
        const validation = validateForm(data);
        if (Object.keys(validation).length > 0) {
            setErrors(validation);
            return;
        }
        setErrors({});
        setSaving(true);
        try {
            const payload: UpdateEntityRequest = {
                code: code.trim().toUpperCase(),
                name: name.trim(),
                observations: observations.trim() || undefined,
                is_active: isActive,
            };
            await entitiesService.update(entity.code, payload);
            onSave();
            onClose();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al actualizar la entidad';
            setErrors({ submit: msg });
        } finally {
            setSaving(false);
        }
    };

    const isValid = Object.keys(validateForm({ code, name })).length === 0;

    if (!entity) return null;

    return (
        <BaseModal
            isOpen={!!entity}
            onClose={onClose}
            title={`Editar entidad: ${entity.name}`}
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
                        Guardar
                    </BaseButton>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Nombre de la entidad" error={errors.name} htmlFor="edit-modal-entityName">
                        <Input
                            id="edit-modal-entityName"
                            placeholder="Ej. Hospital Alma Mater"
                            value={name}
                            onChange={(e) => update('name', e.target.value)}
                        />
                    </FormField>
                    <FormField label="Codigo" error={errors.code} htmlFor="edit-modal-entityCode">
                        <Input
                            id="edit-modal-entityCode"
                            placeholder="Ej. HAMA"
                            value={code}
                            onChange={(e) => update('code', e.target.value)}
                        />
                    </FormField>
                </div>
                <FormField label="Observaciones" htmlFor="edit-modal-observations">
                    <Textarea
                        id="edit-modal-observations"
                        placeholder="Notas relevantes (opcional)"
                        rows={3}
                        value={observations}
                        onChange={(e) => update('observations', e.target.value)}
                    />
                </FormField>
                <BaseCheckbox
                    label="Entidad activa"
                    checked={isActive}
                    onChange={(e) => update('isActive', e.target.checked)}
                />
                {errors.submit && (
                    <div className="text-sm font-medium text-red-600">{errors.submit}</div>
                )}
            </form>
        </BaseModal>
    );
}
