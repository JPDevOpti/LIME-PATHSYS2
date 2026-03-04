'use client';

import { useState, useEffect } from 'react';
import { FormField, Input, Textarea } from '@/shared/components/ui/form';
import { BaseButton } from '@/shared/components/base';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { UserProfile, ProfileEditPayload } from '../types/userProfile.types';

interface ProfileEditFormProps {
    user: UserProfile;
    isLoading?: boolean;
    onSubmit: (payload: ProfileEditPayload) => void;
    onCancel: () => void;
}

export function ProfileEditForm({ user, isLoading = false, onSubmit, onCancel }: ProfileEditFormProps) {
    const [patologoForm, setPatologoForm] = useState({
        patologoName: `${user.firstName} ${user.lastName}`.trim(),
        InicialesPatologo: user.roleSpecificData?.iniciales || '',
        PatologoEmail: user.email,
        registro_medico: user.roleSpecificData?.registroMedico || '',
        password: '',
        passwordConfirm: '',
        observaciones: user.roleSpecificData?.observaciones || '',
    });
    const [residenteForm, setResidenteForm] = useState({
        residenteName: `${user.firstName} ${user.lastName}`.trim(),
        InicialesResidente: user.roleSpecificData?.iniciales || '',
        ResidenteEmail: user.email,
        registro_medico: user.roleSpecificData?.registroMedico || '',
        password: '',
        passwordConfirm: '',
        observaciones: user.roleSpecificData?.observaciones || '',
    });
    const [auxiliarForm, setAuxiliarForm] = useState({
        auxiliarName: `${user.firstName} ${user.lastName}`.trim(),
        AuxiliarEmail: user.email,
        password: '',
        passwordConfirm: '',
        observaciones: user.roleSpecificData?.observaciones || '',
    });
    const [visitanteForm, setVisitanteForm] = useState({
        visitanteName: `${user.firstName} ${user.lastName}`.trim(),
        VisitanteEmail: user.email,
        password: '',
        passwordConfirm: '',
        observaciones: user.roleSpecificData?.observaciones || '',
    });
    const [adminForm, setAdminForm] = useState({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
    });

    useEffect(() => {
        setPatologoForm((p) => ({
            ...p,
            patologoName: `${user.firstName} ${user.lastName}`.trim(),
            InicialesPatologo: user.roleSpecificData?.iniciales || '',
            PatologoEmail: user.email,
            registro_medico: user.roleSpecificData?.registroMedico || '',
            observaciones: user.roleSpecificData?.observaciones || '',
        }));
        setResidenteForm((r) => ({
            ...r,
            residenteName: `${user.firstName} ${user.lastName}`.trim(),
            InicialesResidente: user.roleSpecificData?.iniciales || '',
            ResidenteEmail: user.email,
            registro_medico: user.roleSpecificData?.registroMedico || '',
            observaciones: user.roleSpecificData?.observaciones || '',
        }));
        setAuxiliarForm((a) => ({
            ...a,
            auxiliarName: `${user.firstName} ${user.lastName}`.trim(),
            AuxiliarEmail: user.email,
            observaciones: user.roleSpecificData?.observaciones || '',
        }));
        setVisitanteForm((v) => ({
            ...v,
            visitanteName: `${user.firstName} ${user.lastName}`.trim(),
            VisitanteEmail: user.email,
            observaciones: user.roleSpecificData?.observaciones || '',
        }));
        setAdminForm({ firstName: user.firstName, lastName: user.lastName, email: user.email });
    }, [user]);

    const hasChanges = () => {
        const orig = {
            patologo: { patologoName: `${user.firstName} ${user.lastName}`.trim(), InicialesPatologo: user.roleSpecificData?.iniciales || '', PatologoEmail: user.email, registro_medico: user.roleSpecificData?.registroMedico || '', observaciones: user.roleSpecificData?.observaciones || '' },
            residente: { residenteName: `${user.firstName} ${user.lastName}`.trim(), InicialesResidente: user.roleSpecificData?.iniciales || '', ResidenteEmail: user.email, registro_medico: user.roleSpecificData?.registroMedico || '', observaciones: user.roleSpecificData?.observaciones || '' },
            auxiliar: { auxiliarName: `${user.firstName} ${user.lastName}`.trim(), AuxiliarEmail: user.email, observaciones: user.roleSpecificData?.observaciones || '' },
            visitante: { visitanteName: `${user.firstName} ${user.lastName}`.trim(), VisitanteEmail: user.email, observaciones: user.roleSpecificData?.observaciones || '' },
            admin: { firstName: user.firstName, lastName: user.lastName, email: user.email },
        };
        if (user.role === 'patologo') return JSON.stringify(patologoForm) !== JSON.stringify(orig.patologo);
        if (user.role === 'residente') return JSON.stringify(residenteForm) !== JSON.stringify(orig.residente);
        if (user.role === 'auxiliar') return JSON.stringify(auxiliarForm) !== JSON.stringify(orig.auxiliar);
        if (user.role === 'visitante') return JSON.stringify(visitanteForm) !== JSON.stringify(orig.visitante);
        return JSON.stringify(adminForm) !== JSON.stringify(orig.admin);
    };

    const validatePasswords = (password: string, passwordConfirm: string): boolean => {
        if (!password?.trim()) return true;
        if (password.length < 8) {
            alert('La contraseña debe tener al menos 8 caracteres');
            return false;
        }
        if (password !== passwordConfirm) {
            alert('Las contraseñas no coinciden');
            return false;
        }
        return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let payload: ProfileEditPayload;
        if (user.role === 'patologo') {
            if (!validatePasswords(patologoForm.password, patologoForm.passwordConfirm)) return;
            payload = { role: 'patologo', ...patologoForm };
        } else if (user.role === 'residente') {
            if (!validatePasswords(residenteForm.password, residenteForm.passwordConfirm)) return;
            payload = { role: 'residente', ...residenteForm };
        } else if (user.role === 'auxiliar') {
            if (!validatePasswords(auxiliarForm.password, auxiliarForm.passwordConfirm)) return;
            payload = { role: 'auxiliar', ...auxiliarForm, auxiliarCode: '' };
        } else if (user.role === 'visitante') {
            if (!validatePasswords(visitanteForm.password, visitanteForm.passwordConfirm)) return;
            payload = {
                role: 'visitante',
                ...visitanteForm,
                visitanteCode: (user.roleSpecificData as { visitanteCode?: string; billing_code?: string })?.visitanteCode
                    || (user.roleSpecificData as { visitanteCode?: string; billing_code?: string })?.billing_code || '',
            };
        } else {
            payload = { role: 'admin', ...adminForm };
        }
        onSubmit(payload);
    };

    const inputClass =
        'w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {user.role === 'patologo' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <h4 className="text-lg font-medium text-neutral-900 mb-1">Editar Patólogo</h4>
                        <p className="text-sm text-neutral-500">Modifica los datos del patólogo</p>
                    </div>
                    <FormField label="Nombre completo *">
                        <input
                            type="text"
                            className={inputClass}
                            value={patologoForm.patologoName}
                            onChange={(e) => setPatologoForm((p) => ({ ...p, patologoName: e.target.value }))}
                        />
                    </FormField>
                    <FormField label="Iniciales">
                        <input
                            type="text"
                            maxLength={10}
                            className={inputClass}
                            value={patologoForm.InicialesPatologo}
                            onChange={(e) => setPatologoForm((p) => ({ ...p, InicialesPatologo: e.target.value }))}
                        />
                    </FormField>
                    <FormField label="Correo electrónico *">
                        <input
                            type="email"
                            className={inputClass}
                            value={patologoForm.PatologoEmail}
                            onChange={(e) => setPatologoForm((p) => ({ ...p, PatologoEmail: e.target.value }))}
                        />
                    </FormField>
                    <FormField label="Registro médico *">
                        <input
                            type="text"
                            className={inputClass}
                            value={patologoForm.registro_medico}
                            onChange={(e) => setPatologoForm((p) => ({ ...p, registro_medico: e.target.value }))}
                        />
                    </FormField>
                    <div className="md:col-span-2">
                        <FormField label="Observaciones">
                            <Textarea
                                rows={3}
                                value={patologoForm.observaciones}
                                onChange={(e) => setPatologoForm((p) => ({ ...p, observaciones: e.target.value }))}
                                className={inputClass}
                            />
                        </FormField>
                    </div>
                    <FormField label="Nueva contraseña (opcional)">
                        <input
                            type="password"
                            placeholder="••••••••"
                            className={inputClass}
                            value={patologoForm.password}
                            onChange={(e) => setPatologoForm((p) => ({ ...p, password: e.target.value }))}
                        />
                    </FormField>
                    <FormField label="Confirmar contraseña">
                        <input
                            type="password"
                            placeholder="••••••••"
                            className={inputClass}
                            value={patologoForm.passwordConfirm}
                            onChange={(e) => setPatologoForm((p) => ({ ...p, passwordConfirm: e.target.value }))}
                        />
                    </FormField>
                </div>
            )}

            {user.role === 'residente' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <h4 className="text-lg font-medium text-neutral-900 mb-1">Editar Residente</h4>
                        <p className="text-sm text-neutral-500">Modifica los datos del residente</p>
                    </div>
                    <FormField label="Nombre completo *">
                        <input
                            type="text"
                            className={inputClass}
                            value={residenteForm.residenteName}
                            onChange={(e) => setResidenteForm((r) => ({ ...r, residenteName: e.target.value }))}
                        />
                    </FormField>
                    <FormField label="Iniciales">
                        <input
                            type="text"
                            maxLength={10}
                            className={inputClass}
                            value={residenteForm.InicialesResidente}
                            onChange={(e) => setResidenteForm((r) => ({ ...r, InicialesResidente: e.target.value }))}
                        />
                    </FormField>
                    <FormField label="Correo electrónico *">
                        <input
                            type="email"
                            className={inputClass}
                            value={residenteForm.ResidenteEmail}
                            onChange={(e) => setResidenteForm((r) => ({ ...r, ResidenteEmail: e.target.value }))}
                        />
                    </FormField>
                    <FormField label="Registro médico *">
                        <input
                            type="text"
                            className={inputClass}
                            value={residenteForm.registro_medico}
                            onChange={(e) => setResidenteForm((r) => ({ ...r, registro_medico: e.target.value }))}
                        />
                    </FormField>
                    <div className="md:col-span-2">
                        <FormField label="Observaciones">
                            <Textarea
                                rows={3}
                                value={residenteForm.observaciones}
                                onChange={(e) => setResidenteForm((r) => ({ ...r, observaciones: e.target.value }))}
                                className={inputClass}
                            />
                        </FormField>
                    </div>
                    <FormField label="Nueva contraseña (opcional)">
                        <input
                            type="password"
                            placeholder="••••••••"
                            className={inputClass}
                            value={residenteForm.password}
                            onChange={(e) => setResidenteForm((r) => ({ ...r, password: e.target.value }))}
                        />
                    </FormField>
                    <FormField label="Confirmar contraseña">
                        <input
                            type="password"
                            placeholder="••••••••"
                            className={inputClass}
                            value={residenteForm.passwordConfirm}
                            onChange={(e) => setResidenteForm((r) => ({ ...r, passwordConfirm: e.target.value }))}
                        />
                    </FormField>
                </div>
            )}

            {user.role === 'auxiliar' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <h4 className="text-lg font-medium text-neutral-900 mb-1">Editar Auxiliar</h4>
                        <p className="text-sm text-neutral-500">Actualiza los datos del auxiliar</p>
                    </div>
                    <FormField label="Nombre completo *">
                        <input
                            type="text"
                            className={inputClass}
                            value={auxiliarForm.auxiliarName}
                            onChange={(e) => setAuxiliarForm((a) => ({ ...a, auxiliarName: e.target.value }))}
                        />
                    </FormField>
                    <FormField label="Correo electrónico *">
                        <input
                            type="email"
                            className={inputClass}
                            value={auxiliarForm.AuxiliarEmail}
                            onChange={(e) => setAuxiliarForm((a) => ({ ...a, AuxiliarEmail: e.target.value }))}
                        />
                    </FormField>
                    <div className="md:col-span-2">
                        <FormField label="Observaciones">
                            <Textarea
                                rows={3}
                                value={auxiliarForm.observaciones}
                                onChange={(e) => setAuxiliarForm((a) => ({ ...a, observaciones: e.target.value }))}
                                className={inputClass}
                            />
                        </FormField>
                    </div>
                    <FormField label="Nueva contraseña (opcional)">
                        <input
                            type="password"
                            placeholder="••••••••"
                            className={inputClass}
                            value={auxiliarForm.password}
                            onChange={(e) => setAuxiliarForm((a) => ({ ...a, password: e.target.value }))}
                        />
                    </FormField>
                    <FormField label="Confirmar contraseña">
                        <input
                            type="password"
                            placeholder="••••••••"
                            className={inputClass}
                            value={auxiliarForm.passwordConfirm}
                            onChange={(e) => setAuxiliarForm((a) => ({ ...a, passwordConfirm: e.target.value }))}
                        />
                    </FormField>
                </div>
            )}

            {user.role === 'visitante' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <h4 className="text-lg font-medium text-neutral-900 mb-1">Editar Visitante</h4>
                        <p className="text-sm text-neutral-500">Modifica los datos del visitante</p>
                    </div>
                    <FormField label="Nombre completo *">
                        <input
                            type="text"
                            className={inputClass}
                            value={visitanteForm.visitanteName}
                            onChange={(e) => setVisitanteForm((f) => ({ ...f, visitanteName: e.target.value }))}
                        />
                    </FormField>
                    <FormField label="Email *">
                        <input
                            type="email"
                            className={inputClass}
                            value={visitanteForm.VisitanteEmail}
                            onChange={(e) => setVisitanteForm((f) => ({ ...f, VisitanteEmail: e.target.value }))}
                        />
                    </FormField>
                    <div className="md:col-span-2">
                        <FormField label="Observaciones">
                            <Textarea
                                rows={3}
                                value={visitanteForm.observaciones}
                                onChange={(e) => setVisitanteForm((f) => ({ ...f, observaciones: e.target.value }))}
                                className={inputClass}
                            />
                        </FormField>
                    </div>
                    <FormField label="Nueva contraseña (opcional)">
                        <input
                            type="password"
                            placeholder="••••••••"
                            className={inputClass}
                            value={visitanteForm.password}
                            onChange={(e) => setVisitanteForm((f) => ({ ...f, password: e.target.value }))}
                        />
                    </FormField>
                    <FormField label="Confirmar contraseña">
                        <input
                            type="password"
                            placeholder="••••••••"
                            className={inputClass}
                            value={visitanteForm.passwordConfirm}
                            onChange={(e) => setVisitanteForm((f) => ({ ...f, passwordConfirm: e.target.value }))}
                        />
                    </FormField>
                </div>
            )}

            {(user.role === 'admin' || !['patologo', 'residente', 'auxiliar', 'visitante'].includes(user.role)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <h4 className="text-lg font-medium text-neutral-900 mb-1">Editar Perfil</h4>
                        <p className="text-sm text-neutral-500">Actualiza tus datos básicos</p>
                    </div>
                    <FormField label="Nombre *">
                        <input
                            type="text"
                            className={inputClass}
                            value={adminForm.firstName}
                            onChange={(e) => setAdminForm((a) => ({ ...a, firstName: e.target.value }))}
                        />
                    </FormField>
                    <FormField label="Apellido *">
                        <input
                            type="text"
                            className={inputClass}
                            value={adminForm.lastName}
                            onChange={(e) => setAdminForm((a) => ({ ...a, lastName: e.target.value }))}
                        />
                    </FormField>
                    <div className="md:col-span-2">
                        <FormField label="Correo electrónico *">
                            <input
                                type="email"
                                className={inputClass}
                                value={adminForm.email}
                                onChange={(e) => setAdminForm((a) => ({ ...a, email: e.target.value }))}
                            />
                        </FormField>
                    </div>
                </div>
            )}

            {hasChanges() && !isLoading && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-800">Tienes cambios sin guardar. Asegúrate de guardar antes de cerrar.</p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-neutral-200">
                <BaseButton
                    type="submit"
                    disabled={isLoading || !hasChanges()}
                    loading={isLoading}
                    className="flex-1 sm:flex-none sm:order-2 bg-blue-600 hover:bg-blue-700"
                >
                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </BaseButton>
                <BaseButton
                    type="button"
                    variant="secondary"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none sm:order-1"
                >
                    Cancelar
                </BaseButton>
            </div>
        </form>
    );
}
