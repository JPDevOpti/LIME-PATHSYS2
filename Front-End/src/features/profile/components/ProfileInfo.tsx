'use client';

import { BaseCard } from '@/shared/components/base';
import { ProfileInfoCard } from './ProfileInfoCard';
import type { UserProfile, UserRole } from '../types/userProfile.types';

const ROLE_LABELS: Record<UserRole, string> = {
    admin: 'Administrador',
    patologo: 'Patólogo',
    residente: 'Residente',
    auxiliar: 'Auxiliar',
    visitante: 'Visitante',
};

function hasRoleSpecificData(user: UserProfile): boolean {
    const data = user.roleSpecificData;
    if (!data) return false;
    return !!(
        data.iniciales ||
        data.registroMedico ||
        data.observaciones ||
        data.patologoCode ||
        data.pathologistCode ||
        data.residentCode ||
        (data.associatedEntities && data.associatedEntities.length > 0)
    );
}

interface ProfileInfoProps {
    user: UserProfile;
}

export function ProfileInfo({ user }: ProfileInfoProps) {
    const showRoleData = hasRoleSpecificData(user);

    return (
        <BaseCard title="Información Personal">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <ProfileInfoCard
                    icon="user"
                    label="Nombre Completo"
                    value={`${user.firstName} ${user.lastName}`.trim() || '-'}
                />
                <ProfileInfoCard icon="email" label="Correo Electrónico" value={user.email} />
                <ProfileInfoCard icon="role" label="Rol" value={ROLE_LABELS[user.role]} />
                <ProfileInfoCard
                    icon="status"
                    label="Estado"
                    value={user.isActive ? 'Activo' : 'Inactivo'}
                    statusColor={user.isActive ? 'green' : 'red'}
                />
            </div>

            {showRoleData && user.roleSpecificData && (
                <div className="border-t border-neutral-200 pt-6">
                    <h4 className="text-md font-semibold text-neutral-900 mb-4">
                        Información Específica - {ROLE_LABELS[user.role]}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {user.role === 'patologo' && (
                            <>
                                {(user.roleSpecificData.patologoCode || user.roleSpecificData.pathologistCode) && (
                                    <ProfileInfoCard
                                        icon="document"
                                        label="Código de Patólogo"
                                        value={user.roleSpecificData.patologoCode || user.roleSpecificData.pathologistCode || ''}
                                    />
                                )}
                                {user.roleSpecificData.iniciales && (
                                    <ProfileInfoCard
                                        icon="initials"
                                        label="Iniciales"
                                        value={user.roleSpecificData.iniciales}
                                    />
                                )}
                                {user.roleSpecificData.registroMedico && (
                                    <ProfileInfoCard
                                        icon="registro"
                                        label="Registro Médico"
                                        value={user.roleSpecificData.registroMedico}
                                    />
                                )}
                                {user.roleSpecificData.observaciones && (
                                    <ProfileInfoCard
                                        icon="document"
                                        label="Observaciones"
                                        value={user.roleSpecificData.observaciones}
                                    />
                                )}
                            </>
                        )}
                        {user.role === 'residente' && (
                            <>
                                {user.roleSpecificData.residentCode && (
                                    <ProfileInfoCard
                                        icon="document"
                                        label="Código de Residente"
                                        value={user.roleSpecificData.residentCode}
                                    />
                                )}
                                {user.roleSpecificData.iniciales && (
                                    <ProfileInfoCard
                                        icon="initials"
                                        label="Iniciales"
                                        value={user.roleSpecificData.iniciales}
                                    />
                                )}
                                {user.roleSpecificData.registroMedico && (
                                    <ProfileInfoCard
                                        icon="registro"
                                        label="Registro Médico"
                                        value={user.roleSpecificData.registroMedico}
                                    />
                                )}
                                {user.roleSpecificData.observaciones && (
                                    <ProfileInfoCard
                                        icon="document"
                                        label="Observaciones"
                                        value={user.roleSpecificData.observaciones}
                                    />
                                )}
                            </>
                        )}
                        {(user.role === 'auxiliar' || user.role === 'admin') && (
                            <>
                                {user.roleSpecificData.observaciones && (
                                    <ProfileInfoCard
                                        icon="document"
                                        label="Observaciones"
                                        value={user.roleSpecificData.observaciones}
                                    />
                                )}
                            </>
                        )}
                        {user.role === 'visitante' && (
                            <>
                                {user.roleSpecificData.observaciones && (
                                    <ProfileInfoCard
                                        icon="document"
                                        label="Observaciones"
                                        value={user.roleSpecificData.observaciones}
                                    />
                                )}
                                {user.roleSpecificData.associatedEntities &&
                                    user.roleSpecificData.associatedEntities.length > 0 && (
                                        <div className="col-span-full">
                                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                                                Entidades Asociadas
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {user.roleSpecificData.associatedEntities.map((entity) => (
                                                    <span
                                                        key={entity.id || entity.codigo || ''}
                                                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                                                    >
                                                        {entity.name || entity.nombre} (
                                                        {entity.id || entity.codigo})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </BaseCard>
    );
}
