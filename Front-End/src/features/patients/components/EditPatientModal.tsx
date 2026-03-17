'use client';

import { Patient } from '../types/patient.types';
import { PatientForm } from './PatientForm';
import { BaseModal } from '@/shared/components/overlay/BaseModal';

interface EditPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: Patient | null;
    onSuccess?: (updatedPatient: Patient) => void;
    hideCrearCasoLink?: boolean;
}

export function EditPatientModal({
    isOpen,
    onClose,
    patient,
    onSuccess,
    hideCrearCasoLink = false
}: EditPatientModalProps) {
    if (!patient) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Editar paciente"
            size="4xl"
        >
            <PatientForm
                initialData={patient}
                isEditMode={true}
                hideCrearCasoLink={hideCrearCasoLink}
                onCloseSuccess={(updatedPatient) => {
                    if (updatedPatient) onSuccess?.(updatedPatient);
                    onClose();
                }}
                onCancel={onClose}
            />
        </BaseModal>
    );
}
