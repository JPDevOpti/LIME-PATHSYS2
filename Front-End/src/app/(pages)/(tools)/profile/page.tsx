'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileHeader, ProfileInfo, ProfileEditModal, SignatureManager } from '@/features/profile/components';
import { useAuth } from '@/features/auth/context/AuthContext';
import { authService } from '@/features/auth/services/auth.service';
import { profilesService } from '@/features/profiles-management/services/profiles.service';
import { getAuthToken } from '@/shared/api/client';
import { userToProfile } from '@/features/profile/utils/userToProfile';
import type { UserProfile, ProfileEditPayload } from '@/features/profile/types/userProfile.types';
import type { UpdateProfilePayload } from '@/features/profiles-management/types/profile.types';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { CheckCircle } from 'lucide-react';

export default function ProfilePage() {
    const router = useRouter();
    const { user: authUser, isLoggedIn, isLoading: authLoading, updateUser } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    useEffect(() => {
        if (!authLoading && !isLoggedIn) {
            router.replace('/');
            return;
        }
        if (!authLoading && authUser) {
            const load = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const token = getAuthToken();
                    const fresh = token
                        ? await authService.getCurrentUser(token)
                        : authUser;
                    setUserProfile(userToProfile(fresh));
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to load profile');
                    setUserProfile(userToProfile(authUser));
                } finally {
                    setIsLoading(false);
                }
            };
            load();
        }
    }, [authUser, authLoading, isLoggedIn, router]);

    const handleProfileUpdate = async (formData: ProfileEditPayload) => {
        if (!userProfile) return;
        setIsSaving(true);
        setError(null);
        try {
            const updatePayload: UpdateProfilePayload = {
                role: (formData.role === 'admin' ? 'administrador' : formData.role) as any,
                password: 'password' in formData ? formData.password : undefined,
            };

            if (formData.role === 'patologo') {
                updatePayload.name = formData.patologoName;
                updatePayload.email = formData.PatologoEmail;
                updatePayload.initials = formData.InicialesPatologo;
                updatePayload.medicalLicense = formData.registro_medico;
                updatePayload.observations = formData.observaciones;
            } else if (formData.role === 'residente') {
                updatePayload.name = formData.residenteName;
                updatePayload.email = formData.ResidenteEmail;
                updatePayload.initials = formData.InicialesResidente;
                updatePayload.medicalLicense = formData.registro_medico;
                updatePayload.observations = formData.observaciones;
            } else if (formData.role === 'auxiliar') {
                updatePayload.name = formData.auxiliarName;
                updatePayload.email = formData.AuxiliarEmail;
                updatePayload.observations = formData.observaciones;
            } else if (formData.role === 'visitante') {
                updatePayload.name = formData.visitanteName;
                updatePayload.email = formData.VisitanteEmail;
                updatePayload.observations = formData.observaciones;
            } else {
                updatePayload.name = `${formData.firstName} ${formData.lastName}`.trim();
                updatePayload.email = formData.email;
            }

            const updatedProfileData = await profilesService.updateMyProfile(updatePayload);

            // Actualizar el estado local con los datos devueltos por el servidor
            setUserProfile((prev) => {
                if (!prev) return null;
                const [firstName, ...rest] = (updatedProfileData.name || '').split(' ');
                return {
                    ...prev,
                    firstName: firstName || prev.firstName,
                    lastName: rest.join(' ') || prev.lastName,
                    email: updatedProfileData.email || prev.email,
                    roleSpecificData: {
                        ...prev.roleSpecificData,
                        iniciales: updatedProfileData.initials || prev.roleSpecificData?.iniciales,
                        registroMedico: updatedProfileData.medicalLicense || prev.roleSpecificData?.registroMedico,
                        observaciones: updatedProfileData.observations || prev.roleSpecificData?.observaciones,
                    },
                };
            });

            setIsEditModalOpen(false);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al actualizar el perfil');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignatureSaved = (base64: string | null) => {
        const sig = base64 ?? '';
        // Actualizar estado local de la página
        setUserProfile((p) =>
            p ? { ...p, roleSpecificData: { ...p.roleSpecificData, firmaUrl: sig || undefined } } : null
        );
        // Actualizar el contexto de auth y el storage para que persista al recargar
        updateUser({ signature: sig });
    };

    const canEdit = ['admin', 'patologo', 'residente', 'auxiliar', 'visitante'].includes(
        userProfile?.role ?? ''
    );

    if (authLoading || (!isLoggedIn && !authUser)) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 animate-pulse">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-24 h-24 bg-neutral-200 rounded-full" />
                        <div className="space-y-2">
                            <div className="h-6 bg-neutral-200 rounded w-48" />
                            <div className="h-4 bg-neutral-200 rounded w-32" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {isLoading && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 animate-pulse">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-24 h-24 bg-neutral-200 rounded-full" />
                            <div className="space-y-2">
                                <div className="h-6 bg-neutral-200 rounded w-48" />
                                <div className="h-4 bg-neutral-200 rounded w-32" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {userProfile && !isLoading && (
                <div className="space-y-6">
                    <ProfileHeader
                        user={userProfile}
                        isEditable={canEdit}
                        onEdit={canEdit ? () => setIsEditModalOpen(true) : undefined}
                    />
                    <ProfileInfo user={userProfile} />
                    {(userProfile.role === 'patologo' || userProfile.role === 'residente') && (
                        <SignatureManager
                            currentUrl={userProfile.roleSpecificData?.firmaUrl}
                            onSaved={handleSignatureSaved}
                        />
                    )}
                </div>
            )}

            {error && !isLoading && (
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                    <div className="text-center">
                        <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                            Error al cargar el perfil
                        </h3>
                        <p className="text-neutral-600 mb-4">{error}</p>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {userProfile && (
                <ProfileEditModal
                    isOpen={isEditModalOpen}
                    user={userProfile}
                    isLoading={isSaving}
                    onClose={() => setIsEditModalOpen(false)}
                    onSubmit={handleProfileUpdate}
                />
            )}

            {showSuccessToast && (
                <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Perfil actualizado correctamente</span>
                </div>
            )}
        </div>
    );
}
