'use client';

import { FormField, Input, Select } from '@/shared/components/ui/form';
import type { ProfileRole } from '../types/profile.types';

const ROLE_OPTIONS: { value: ProfileRole; label: string }[] = [
    { value: 'administrador', label: 'Administrador' },
    { value: 'patologo', label: 'Patologo' },
    { value: 'residente', label: 'Residente' },
    { value: 'recepcionista', label: 'Auxiliar administrativo' },
    { value: 'visitante', label: 'Visitante' },
    { value: 'paciente', label: 'Paciente' },
    ];

interface ProfileFormProps {
    name: string;
    role: ProfileRole;
    onNameChange: (v: string) => void;
    onRoleChange: (v: ProfileRole) => void;
}

export function ProfileForm({ name, role, onNameChange, onRoleChange }: ProfileFormProps) {
    return (
        <div className="space-y-4">
            <FormField label="Nombre del perfil" htmlFor="profile-name">
                <Input
                    id="profile-name"
                    placeholder="Ej: Coordinador de laboratorio"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                />
            </FormField>
            <FormField label="Rol">
                <Select
                    value={role}
                    onChange={(e) => onRoleChange(e.target.value as ProfileRole)}
                    options={ROLE_OPTIONS}
                    placeholder="Seleccionar rol"
                />
            </FormField>
        </div>
    );
}
