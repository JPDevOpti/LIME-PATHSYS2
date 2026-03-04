'use client';

import { Patient } from '../types/patient.types';
import { PatientForm } from './PatientForm';
import { BaseModal } from '@/shared/components/overlay/BaseModal';

interface EditPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: Patient | null;
    /** Se llama con el paciente actualizado al guardar exitosamente */
    onSuccess?: (updatedPatient: Patient) => void;
    /** Oculta "Crear caso" en el modal de éxito (ej: cuando se edita desde crear caso) */
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
