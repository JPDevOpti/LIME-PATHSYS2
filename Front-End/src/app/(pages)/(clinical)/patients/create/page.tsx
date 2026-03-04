'use client';

import { UserPlus } from 'lucide-react';

import { PageTitleCard } from '@/shared/components/ui/page-title';
import { PatientForm } from '@/features/patients/components/PatientForm';

export default function CreatePatientPage() {
    return (
        <div className="space-y-6">
            <PageTitleCard
                title="Crear Paciente"
                description="Registre un nuevo paciente en el sistema. Complete la información personal y de contacto a continuación para crear el expediente del paciente."
                icon={UserPlus}
                accentColor="emerald"
            />
            <PatientForm />
        </div>
    );
}
