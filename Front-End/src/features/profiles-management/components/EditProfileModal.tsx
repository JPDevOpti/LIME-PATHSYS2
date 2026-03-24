'use client';

import { useState, useEffect } from 'react';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton } from '@/shared/components/base';
import { EditProfileForm, fromProfile, type EditProfileFormState } from './EditProfileForm';
import { profilesService } from '../services/profiles.service';
import type { Profile, UpdateProfilePayload } from '../types/profile.types';
import { Loader2 } from 'lucide-react';

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
    if (state.password?.trim()) payload.password = state.password.trim();
    return payload;
}

interface EditProfileModalProps {
    profile: Profile | null;
    onClose: () => void;
    onSave: (payload: UpdateProfilePayload) => Promise<void>;
}

export function EditProfileModal({ profile, onClose, onSave }: EditProfileModalProps) {
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingSignature, setLoadingSignature] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [state, setState] = useState<EditProfileFormState | null>(null);

    useEffect(() => {
        if (profile) {
            // OPTIMIZACIÓN ULTRA: Seteamos el estado inicial con lo que ya tenemos del listado
            // Esto hace que el modal abra INSTANTÁNEAMENTE con datos básicos.
            setState(fromProfile(profile));
            setLoading(true);
            setError(null);

            // 1. Cargamos los detalles completos (observations, medical_license, etc) SIN la firma primero.
            // Esto es muy rápido porque no viaja el Base64.
            profilesService.get(profile.id, false)
                .then((fullProfile) => {
                    if (fullProfile) {
                        setState(fromProfile(fullProfile));
                        
                        // 2. Si es un rol clínico, cargamos la firma en SEGUNDO PLANO
                        const role = String(fullProfile.role || '').toLowerCase();
                        const isClinical = role.includes('patol') || role.includes('resid');
                        
                        if (isClinical) {
                            setLoadingSignature(true);
                            profilesService.get(profile.id, true)
                                .then(withSig => {
                                    // Verificamos que traiga algo que parezca una firma (base64 o URL)
                                    if (withSig && typeof withSig.signature === 'string' && withSig.signature.length > 0) {
                                        setState(prev => {
                                            if (!prev) return null;
                                            return { ...prev, signature: withSig.signature! };
                                        });
                                    }
                                })
                                .catch(err => console.error('Error loading signature:', err))
                                .finally(() => setLoadingSignature(false));
                        }
                    }
                })
                .catch((e) => {
                    console.error('Error fetching full profile:', e);
                })
                .finally(() => setLoading(false));
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
        if (state.password.trim()) {
            if (state.password.length < 8) {
                setError('La contrasena debe tener al menos 8 caracteres');
                return;
            }
            if (state.password !== state.passwordConfirm) {
                setError('Las contrasenas no coinciden');
                return;
            }
        }
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

    if (!profile) return null;

    const isValid = state ? state.name.trim().length > 0 : false;

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
                        disabled={!isValid || saving || loading}
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
                
                {state && (
                    <EditProfileForm 
                        state={state} 
                        onChange={handleChange} 
                        loadingSignature={loadingSignature}
                    />
                )}
            </div>
        </BaseModal>
    );
}
