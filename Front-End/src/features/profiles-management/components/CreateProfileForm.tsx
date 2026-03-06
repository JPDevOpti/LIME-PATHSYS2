'use client';

import { FormField, Input, Select, Textarea } from '@/shared/components/ui/form';
import type { ProfileRole } from '../types/profile.types';

const ROLE_OPTIONS: { value: ProfileRole; label: string }[] = [
    { value: 'administrador', label: 'Administrador' },
    { value: 'patologo', label: 'Patologo' },
    { value: 'residente', label: 'Residente' },
    { value: 'recepcionista', label: 'Auxiliar' },
    { value: 'visitante', label: 'Visitante' },
];

export interface CreateProfileFormState {
    name: string;
    code: string;
    email: string;
    document: string;
    initials: string;
    medicalLicense: string;
    observations: string;
    password: string;
    passwordConfirm: string;
    role: ProfileRole;
    isActive: boolean;
}

const INITIAL_STATE: CreateProfileFormState = {
    name: '',
    code: '',
    email: '',
    document: '',
    initials: '',
    medicalLicense: '',
    observations: '',
    password: '',
    passwordConfirm: '',
    role: 'administrador',
    isActive: true,
};

interface CreateProfileFormProps {
    state: CreateProfileFormState;
    onChange: (updates: Partial<CreateProfileFormState>) => void;
}

function needsInitials(role: ProfileRole): boolean {
    return role === 'patologo' || role === 'residente';
}

function needsMedicalLicense(role: ProfileRole): boolean {
    return role === 'patologo' || role === 'residente';
}

function needsPassword(_role: ProfileRole): boolean {
    return true;
}

export function CreateProfileForm({ state, onChange }: CreateProfileFormProps) {
    const { role } = state;

    return (
        <div className="space-y-5">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
                <FormField label="Tipo de perfil" htmlFor="create-role">
                    <Select
                        id="create-role"
                        value={role}
                        onChange={(e) => onChange({ role: e.target.value as ProfileRole })}
                        options={ROLE_OPTIONS}
                        placeholder="Seleccionar tipo"
                    />
                </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Nombre completo" htmlFor="create-name">
                    <Input
                        id="create-name"
                        placeholder="Ej: Juan Carlos Perez"
                        value={state.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                    />
                </FormField>

                <FormField label="Codigo" htmlFor="create-code">
                    <Input
                        id="create-code"
                        placeholder="Ej: PAT001, ADM001"
                        value={state.code}
                        onChange={(e) => onChange({ code: e.target.value })}
                    />
                </FormField>

                {needsInitials(role) && (
                    <FormField label="Iniciales" htmlFor="create-initials">
                        <Input
                            id="create-initials"
                            placeholder="Ej: JCPG, MER"
                            value={state.initials}
                            onChange={(e) => onChange({ initials: e.target.value })}
                        />
                    </FormField>
                )}

                <FormField label="Correo electronico" htmlFor="create-email">
                    <Input
                        id="create-email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={state.email}
                        onChange={(e) => onChange({ email: e.target.value })}
                    />
                </FormField>

                {(role === 'administrador' || role === 'visitante' || role === 'paciente') && (
                    <FormField
                        label={role === 'visitante' || role === 'paciente' ? 'Documento (paciente vinculado)' : 'Documento'}
                        htmlFor="create-document"
                    >
                        <Input
                            id="create-document"
                            placeholder="Ej: 12345678"
                            value={state.document}
                            onChange={(e) => onChange({ document: e.target.value })}
                        />
                    </FormField>
                )}

                {needsMedicalLicense(role) && (
                    <FormField label="Registro medico" htmlFor="create-medical">
                        <Input
                            id="create-medical"
                            placeholder="Ej: RM-12345"
                            value={state.medicalLicense}
                            onChange={(e) => onChange({ medicalLicense: e.target.value })}
                        />
                    </FormField>
                )}
            </div>

            {needsPassword(role) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Contrasena" htmlFor="create-password">
                        <Input
                            id="create-password"
                            type="password"
                            placeholder="Minimo 8 caracteres"
                            value={state.password}
                            onChange={(e) => onChange({ password: e.target.value })}
                        />
                    </FormField>
                    <FormField label="Confirmar contrasena" htmlFor="create-password-confirm">
                        <Input
                            id="create-password-confirm"
                            type="password"
                            placeholder="Repetir contrasena"
                            value={state.passwordConfirm}
                            onChange={(e) => onChange({ passwordConfirm: e.target.value })}
                        />
                    </FormField>
                </div>
            )}

            <FormField label="Observaciones">
                <Textarea
                    placeholder="Notas adicionales (opcional)"
                    value={state.observations}
                    onChange={(e) => onChange({ observations: e.target.value })}
                    rows={3}
                />
            </FormField>

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

export { INITIAL_STATE };
