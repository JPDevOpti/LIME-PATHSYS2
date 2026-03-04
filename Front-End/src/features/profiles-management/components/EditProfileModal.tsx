'use client';

import { useState, useEffect } from 'react';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton } from '@/shared/components/base';
import { EditProfileForm, fromProfile, type EditProfileFormState } from './EditProfileForm';
import type { Profile, UpdateProfilePayload } from '../types/profile.types';

function buildPayload(state: EditProfileFormState): UpdateProfilePayload {
    const payload: UpdateProfilePayload = {
        name: state.name.trim(),
        role: state.role,
        isActive: state.isActive,
    };
    if (state.code.trim()) payload.code = state.code.trim();
    else payload.code = undefined;
    if (state.email.trim()) payload.email = state.email.trim();
    else payload.email = undefined;
    if (state.document.trim()) payload.document = state.document.trim();
    else payload.document = undefined;
    if (state.initials.trim()) payload.initials = state.initials.trim();
    else payload.initials = undefined;
    if (state.medicalLicense.trim()) payload.medicalLicense = state.medicalLicense.trim();
    else payload.medicalLicense = undefined;
    if (state.observations.trim()) payload.observations = state.observations.trim();
    else payload.observations = undefined;
    payload.signature = state.signature ?? '';
    return payload;
}

interface EditProfileModalProps {
    profile: Profile | null;
    onClose: () => void;
    onSave: (payload: UpdateProfilePayload) => Promise<void>;
}

export function EditProfileModal({ profile, onClose, onSave }: EditProfileModalProps) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [state, setState] = useState<EditProfileFormState | null>(null);

    useEffect(() => {
        if (profile) {
            setState(fromProfile(profile));
            setError(null);
        } else {
            setState(null);
        }
    }, [profile]);

    const handleChange = (updates: Partial<EditProfileFormState>) => {
        setState((prev) => (prev ? { ...prev, ...updates } : null));
        setError(null);
    };

    const handleSubmit = async () => {
        if (!state || !state.name.trim()) return;
        setSaving(true);
        setError(null);
        try {
            await onSave(buildPayload(state));
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al actualizar el perfil');
        } finally {
            setSaving(false);
        }
    };

    if (!profile || !state) return null;

    const isValid = state.name.trim().length > 0;

    return (
        <BaseModal
            isOpen={!!profile}
            onClose={onClose}
            title={`Editar perfil: ${profile.name}`}
            size="xl"
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
            <div className="space-y-4">
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}
                <EditProfileForm state={state} onChange={handleChange} />
            </div>
        </BaseModal>
    );
}
