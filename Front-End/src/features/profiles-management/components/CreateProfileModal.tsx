'use client';

import { useState, useEffect } from 'react';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton } from '@/shared/components/base';
import { CreateProfileForm, INITIAL_STATE, type CreateProfileFormState } from './CreateProfileForm';
import type { CreateProfilePayload, ProfileRole } from '../types/profile.types';

function needsPassword(role: ProfileRole): boolean {
    return true;
}

function buildPayload(state: CreateProfileFormState): CreateProfilePayload {
    const payload: CreateProfilePayload = {
        name: state.name.trim(),
        password: state.password,
        role: state.role,
        isActive: state.isActive,
    };
    if (state.code.trim()) payload.code = state.code.trim();
    if (state.email.trim()) payload.email = state.email.trim();
    if (state.document.trim()) payload.document = state.document.trim();
    if (state.initials.trim()) payload.initials = state.initials.trim();
    if (state.medicalLicense.trim()) payload.medicalLicense = state.medicalLicense.trim();
    if (state.observations.trim()) payload.observations = state.observations.trim();
    return payload;
}

function validateForm(state: CreateProfileFormState): string | null {
    if (!state.name.trim()) return 'El nombre es obligatorio';
    if (!state.email.trim()) return 'El correo electronico es obligatorio';
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(state.email.trim())) return 'Correo electronico no valido';
    if (needsPassword(state.role)) {
        if (state.password.length < 8) return 'La contrasena debe tener al menos 8 caracteres';
        if (state.password !== state.passwordConfirm) return 'Las contrasenas no coinciden';
    }
    return null;
}

interface CreateProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (payload: CreateProfilePayload) => Promise<void>;
}

export function CreateProfileModal({ isOpen, onClose, onSave }: CreateProfileModalProps) {
    const [saving, setSaving] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [state, setState] = useState<CreateProfileFormState>(INITIAL_STATE);

    useEffect(() => {
        if (isOpen) {
            setState(INITIAL_STATE);
            setApiError(null);
            setIsDirty(false);
        }
    }, [isOpen]);

    const handleChange = (updates: Partial<CreateProfileFormState>) => {
        setState((prev) => ({ ...prev, ...updates }));
        setApiError(null);
        setIsDirty(true);
    };

    const handleSubmit = async () => {
        setIsDirty(true);
        const err = validateForm(state);
        if (err) return;
        setSaving(true);
        setApiError(null);
        try {
            await onSave(buildPayload(state));
            onClose();
        } catch (e) {
            setApiError(e instanceof Error ? e.message : 'Error al crear el perfil');
        } finally {
            setSaving(false);
        }
    };

    const validationError = validateForm(state);
    const isValid = !validationError;
    const shownError = apiError ?? (isDirty ? validationError : null);

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Nuevo perfil"
            size="xl"
            footer={
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                        {shownError && (
                            <p className="text-sm text-red-600">{shownError}</p>
                        )}
                    </div>
                    <div className="flex gap-2">
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
                </div>
            }
        >
            <CreateProfileForm state={state} onChange={handleChange} />
        </BaseModal>
    );
}
