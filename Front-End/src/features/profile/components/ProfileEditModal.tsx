'use client';

import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { Pencil } from 'lucide-react';
import { ProfileEditForm } from './ProfileEditForm';
import type { UserProfile, ProfileEditPayload } from '../types/userProfile.types';

interface ProfileEditModalProps {
    isOpen: boolean;
    user: UserProfile;
    isLoading?: boolean;
    onClose: () => void;
    onSubmit: (data: ProfileEditPayload) => void;
}

export function ProfileEditModal({
    isOpen,
    user,
    isLoading = false,
    onClose,
    onSubmit,
}: ProfileEditModalProps) {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50">
                        <Pencil className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-neutral-900">
                            Editar Información Personal
                        </h3>
                        <p className="text-sm text-neutral-500">
                            Actualice sus datos para mantener su perfil al día
                        </p>
                    </div>
                </div>
            }
            size="2xl"
        >
            <ProfileEditForm
                user={user}
                isLoading={isLoading}
                onSubmit={onSubmit}
                onCancel={onClose}
            />
        </BaseModal>
    );
}
