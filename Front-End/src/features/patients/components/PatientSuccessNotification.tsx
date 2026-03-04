'use client';

import { Patient } from '../types/patient.types';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { CloseButton } from '@/shared/components/ui/buttons';

interface PatientSuccessNotificationProps {
    visible: boolean;
    patientData: Patient | null;
    onClose: () => void;
}

export function PatientSuccessNotification({ visible, patientData, onClose }: PatientSuccessNotificationProps) {
    if (!visible || !patientData) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-emerald-50 p-6 flex flex-col items-center text-center border-b border-emerald-100">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3 text-emerald-600">
                        <CheckCircle className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">¡Paciente Guardado!</h3>
                    <p className="text-sm text-gray-500 mt-1">La información del paciente se ha registrado correctamente.</p>
                </div>

                <div className="p-6 space-y-3">
                    <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                        <span className="text-gray-500">Nombre Completo</span>
                        <span className="font-medium text-gray-900">{patientData.full_name}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                        <span className="text-gray-500">Documento</span>
                        <span className="font-medium text-gray-900">{patientData.identification_number}</span>
                    </div>
                    <div className="flex justify-between text-sm py-2">
                        <span className="text-gray-500">Código Sistema</span>
                        <span className="font-medium text-gray-900">{patientData.patient_code}</span>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 flex justify-end gap-3">
                    <CloseButton onClick={onClose} size="sm" />
                    <Link
                        href={patientData.id ? `/cases/create?patientId=${patientData.id}` : '/cases/create'}
                        onClick={onClose}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                    >
                        Crear caso
                    </Link>
                </div>
            </div>
        </div>
    );
}
