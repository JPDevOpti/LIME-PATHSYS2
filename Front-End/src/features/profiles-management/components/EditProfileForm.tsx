'use client';

import { FormField, Input, Select, Textarea } from '@/shared/components/ui/form';
import { SignatureManager } from '@/features/profile/components/SignatureManager';
import type { Profile, ProfileRole } from '../types/profile.types';

const ROLE_OPTIONS: { value: ProfileRole; label: string }[] = [
    { value: 'administrador', label: 'Administrador' },
    { value: 'patologo', label: 'Patologo' },
    { value: 'residente', label: 'Residente' },
    { value: 'recepcionista', label: 'Auxiliar' },
    { value: 'visitante', label: 'Visitante' },
    { value: 'paciente', label: 'Paciente' },
];

export interface EditProfileFormState {
    name: string;
    code: string;
    email: string;
    document: string;
    initials: string;
    medicalLicense: string;
    observations: string;
    signature: string;
    password: string;
    passwordConfirm: string;
    role: ProfileRole;
    isActive: boolean;
}

function needsInitials(role: ProfileRole): boolean {
    return role === 'patologo' || role === 'residente';
}

function needsMedicalLicense(role: ProfileRole): boolean {
    return role === 'patologo' || role === 'residente';
}

function fromProfile(p: Profile): EditProfileFormState {
    return {
        name: p.name ?? '',
        code: p.code ?? '',
        email: p.email ?? '',
        document: p.document ?? '',
        initials: p.initials ?? '',
        medicalLicense: p.medicalLicense ?? '',
        observations: p.observations ?? '',
        signature: p.signature ?? '',
        password: '',
        passwordConfirm: '',
        role: p.role,
        isActive: p.isActive !== false,
    };
}

interface EditProfileFormProps {
    state: EditProfileFormState;
    onChange: (updates: Partial<EditProfileFormState>) => void;
    loadingSignature?: boolean;
}

export function EditProfileForm({ state, onChange, loadingSignature = false }: EditProfileFormProps) {
    const { role } = state;

    return (
        <div className="space-y-5">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
                <FormField label="Tipo de perfil" htmlFor="edit-role">
                    <Select
                        id="edit-role"
                        value={role}
                        onChange={(e) => onChange({ role: e.target.value as ProfileRole })}
                        options={ROLE_OPTIONS}
                        placeholder="Seleccionar tipo"
                    />
                </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Nombre completo" htmlFor="edit-name">
                    <Input
                        id="edit-name"
                        placeholder="Ej: Juan Carlos Perez"
                        value={state.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                    />
                </FormField>

                <FormField label="Codigo" htmlFor="edit-code">
                    <Input
                        id="edit-code"
                        placeholder="Ej: PAT001, ADM001"
                        value={state.code}
                        onChange={(e) => onChange({ code: e.target.value })}
                    />
                </FormField>

                {needsInitials(role) && (
                    <FormField label="Iniciales" htmlFor="edit-initials">
                        <Input
                            id="edit-initials"
                            placeholder="Ej: JCPG, MER"
                            value={state.initials}
                            onChange={(e) => onChange({ initials: e.target.value })}
                        />
                    </FormField>
                )}

                <FormField label="Correo electronico" htmlFor="edit-email">
                    <Input
                        id="edit-email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={state.email}
                        onChange={(e) => onChange({ email: e.target.value })}
                    />
                </FormField>

                {(role === 'administrador' || role === 'visitante' || role === 'paciente') && (
                    <FormField
                        label={role === 'visitante' || role === 'paciente' ? 'Documento (paciente vinculado)' : 'Documento'}
                        htmlFor="edit-document"
                    >
                        <Input
                            id="edit-document"
                            placeholder="Ej: 12345678"
                            value={state.document}
                            onChange={(e) => onChange({ document: e.target.value })}
                        />
                    </FormField>
                )}

                {needsMedicalLicense(role) && (
                    <FormField label="Registro medico" htmlFor="edit-medical">
                        <Input
                            id="edit-medical"
                            placeholder="Ej: RM-12345"
                            value={state.medicalLicense}
                            onChange={(e) => onChange({ medicalLicense: e.target.value })}
                        />
                    </FormField>
                )}
            </div>

            <FormField label="Observaciones">
                <Textarea
                    placeholder="Notas adicionales (opcional)"
                    value={state.observations}
                    onChange={(e) => onChange({ observations: e.target.value })}
                    rows={3}
                />
            </FormField>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
                <p className="text-sm font-medium text-neutral-700 mb-3">Cambiar contrasena (dejar en blanco para mantener la actual)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Nueva contrasena" htmlFor="edit-password">
                        <Input
                            id="edit-password"
                            type="password"
                            placeholder="Minimo 8 caracteres"
                            value={state.password}
                            onChange={(e) => onChange({ password: e.target.value })}
                        />
                    </FormField>
                    <FormField label="Confirmar contrasena" htmlFor="edit-password-confirm">
                        <Input
                            id="edit-password-confirm"
                            type="password"
                            placeholder="Repetir contrasena"
                            value={state.passwordConfirm}
                            onChange={(e) => onChange({ passwordConfirm: e.target.value })}
                        />
                    </FormField>
                </div>
            </div>

            {(role === 'patologo' || role === 'residente') && (
                <div className="relative">
                    {loadingSignature && (
                        <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl border border-dashed border-lime-300">
                            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-lime-100">
                                <div className="h-4 w-4 border-2 border-lime-600 border-t-transparent animate-spin rounded-full" />
                                <span className="text-sm font-semibold text-lime-700">Cargando firma digital...</span>
                            </div>
                        </div>
                    )}
                    <SignatureManager
                        currentUrl={state.signature || null}
                        onChange={(base64) => onChange({ signature: base64 ?? '' })}
                    />
                </div>
            )}

            <label className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={state.isActive}
                    onChange={(e) => onChange({ isActive: e.target.checked })}
                    className="rounded border-neutral-300"
                />
                <span className="text-sm text-neutral-700">Perfil activo</span>
            </label>
        </div>
    );
}

export { fromProfile };
