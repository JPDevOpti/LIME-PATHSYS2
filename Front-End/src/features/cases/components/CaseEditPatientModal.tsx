'use client';

import { useState } from 'react';
import { Patient } from '@/features/patients/types/patient.types';
import { CaseEditPatientForm } from './CaseEditPatientForm';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { SaveButton } from '@/shared/components/ui/buttons';

const FORM_ID = 'case-edit-patient-form';

interface CaseEditPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: Patient | null;
    onSuccess?: (updatedPatient: Patient) => void;
    hideCrearCasoLink?: boolean;
}

export function CaseEditPatientModal({
    isOpen,
    onClose,
    patient,
    onSuccess,
    hideCrearCasoLink = false
}: CaseEditPatientModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    if (!patient) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Editar Paciente"
            size="4xl"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-brand-500"
                        disabled={isLoading}
                    >
                        Cancelar
                    </button>
                    <SaveButton form={FORM_ID} loading={isLoading} disabled={isLoading}>
                        Guardar Cambios
                    </SaveButton>
                </div>
            }
        >
            <CaseEditPatientForm
                patient={patient}
                formId={FORM_ID}
                onLoadingChange={setIsLoading}
                onSuccess={(updatedPatient) => onSuccess?.(updatedPatient)}
                onClose={onClose}
                hideCrearCasoLink={hideCrearCasoLink}
            />
        </BaseModal>
    );
}
