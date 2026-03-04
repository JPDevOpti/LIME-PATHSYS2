'use client';

import { BaseCard } from '@/shared/components/base';
import { BaseButton } from '@/shared/components/base';
import { Pencil } from 'lucide-react';
import type { UserProfile, UserRole } from '../types/userProfile.types';
import { clsx } from 'clsx';

function getInitials(firstName: string, lastName: string): string {
    const first = (firstName || '').trim().charAt(0).toUpperCase();
    const last = (lastName || '').trim().charAt(0).toUpperCase();
    if (first && last) return `${first}${last}`;
    if (first) return first;
    if (last) return last;
    return '?';
}

const ROLE_LABELS: Record<UserRole, string> = {
    admin: 'Administrador',
    patologo: 'Patólogo',
    residente: 'Residente',
    auxiliar: 'Auxiliar',
    visitante: 'Visitante',
};

const ROLE_STYLES: Record<UserRole, string> = {
    admin: 'bg-purple-100 text-purple-800',
    patologo: 'bg-blue-100 text-blue-800',
    residente: 'bg-green-100 text-green-800',
    auxiliar: 'bg-neutral-100 text-neutral-800',
    visitante: 'bg-orange-100 text-orange-800',
};

function normalizeRole(role: string): UserRole {
    const r = String(role || '').toLowerCase();
    if (['admin', 'administrator'].includes(r)) return 'admin';
    if (['patologo', 'pathologist', 'patólogo'].includes(r)) return 'patologo';
    if (['residente', 'resident'].includes(r)) return 'residente';
    if (['auxiliar', 'assistant', 'auxiliary', 'recepcionista'].includes(r)) return 'auxiliar';
    if (['facturacion', 'facturación', 'billing', 'visitante'].includes(r)) return 'visitante';
    return 'admin';
}

function formatLastLogin(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}

interface ProfileHeaderProps {
    user: UserProfile;
    isEditable?: boolean;
    onEdit?: () => void;
}

export function ProfileHeader({ user, isEditable = true, onEdit }: ProfileHeaderProps) {
    const normalizedRole = normalizeRole(user.role);
    const initials = getInitials(user.firstName, user.lastName);

    return (
        <BaseCard className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto sm:mx-0">
                        <div
                            className={clsx(
                                'w-full h-full rounded-full overflow-hidden border-2 border-blue-200 shadow-lg',
                                isEditable && 'hover:border-blue-300'
                            )}
                        >
                            <div className="w-full h-full bg-gradient-to-br from-lime-brand-100 to-lime-brand-50 flex items-center justify-center text-lime-brand-700 text-2xl sm:text-3xl font-bold">
                                {initials}
                            </div>
                        </div>
                        <div
                            className={clsx(
                                'absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-sm',
                                user.isActive ? 'bg-green-500' : 'bg-neutral-400'
                            )}
                            title={user.isActive ? 'Usuario activo' : 'Usuario inactivo'}
                        />
                    </div>
                    <div className="text-center sm:text-left">
                        <h2 className="text-2xl font-bold text-neutral-900 mb-1">
                            {user.firstName} {user.lastName}
                        </h2>
                        <p className="text-sm text-neutral-600">{user.email}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <span
                                className={clsx(
                                    'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                                    ROLE_STYLES[normalizedRole]
                                )}
                            >
                                {ROLE_LABELS[normalizedRole]}
                            </span>
                        </div>
                        {user.lastLogin && (
                            <p className="text-xs text-neutral-500 mt-1">
                                Último acceso: {formatLastLogin(user.lastLogin)}
                            </p>
                        )}
                    </div>
                </div>
                {isEditable && onEdit && (
                    <div className="flex justify-center sm:justify-end">
                        <BaseButton
                            variant="primary"
                            size="md"
                            onClick={onEdit}
                            startIcon={<Pencil className="w-4 h-4" />}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Editar perfil
                        </BaseButton>
                    </div>
                )}
            </div>
        </BaseCard>
    );
}
