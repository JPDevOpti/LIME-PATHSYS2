'use client';

import { useSearchParams } from 'next/navigation';
import { UserPlus } from 'lucide-react';

import { PageTitleCard } from '@/shared/components/ui/page-title';
import { PatientForm } from '@/features/patients/components/PatientForm';

export default function CreatePatientPage() {
    const searchParams = useSearchParams();
    const prefillIdType = searchParams.get('idType') || undefined;
    const prefillIdNumber = searchParams.get('idNumber') || undefined;

    return (
        <div className="space-y-6">
            <PageTitleCard
                title="Crear Paciente"
                description="Registre un nuevo paciente en el sistema. Complete la información personal y de contacto a continuación para crear el expediente del paciente."
                icon={UserPlus}
                accentColor="emerald"
            />
            <PatientForm
                prefillIdentificationType={prefillIdType}
                prefillIdentificationNumber={prefillIdNumber}
            />
        </div>
    );
}
