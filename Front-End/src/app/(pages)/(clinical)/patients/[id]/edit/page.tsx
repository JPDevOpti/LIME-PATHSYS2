'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PatientForm } from '@/features/patients/components/PatientForm';
import { PatientSearch } from '@/features/patients/components/PatientSearch';
import { patientService } from '@/features/patients/services/patient.service';
import { Patient } from '@/features/patients/types/patient.types';
import { BaseCard } from '@/shared/components/base/BaseCard';
import { PageTitleCard } from '@/shared/components/ui/page-title';
import { Loader2, Search, UserRoundPen } from 'lucide-react';

type EditPatientPageContentProps = {
    patientId?: string;
};

export function EditPatientPageContent({ patientId }: EditPatientPageContentProps) {
    const router = useRouter();
    const [patient, setPatient] = useState<Patient | undefined>(undefined);
    const [loading, setLoading] = useState(Boolean(patientId));

    // Search state
    const [identificationType, setIdentificationType] = useState<string>('');
    const [identificationNumber, setIdentificationNumber] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [patientVerified, setPatientVerified] = useState(false);

    useEffect(() => {
        if (patientId) {
            const load = async () => {
                try {
                    const data = await patientService.getPatientById(patientId);
                    if (data) {
                        setPatient(data);
                        setIdentificationType(data.identification_type);
                        setIdentificationNumber(data.identification_number);
                        setPatientVerified(true);
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            load();
        }
    }, [patientId]);

    const handleSearch = async () => {
        if (identificationType === '' || identificationType == null) {
            setSearchError('Seleccione el tipo de identificación');
            return;
        }
        if (!identificationNumber.trim()) {
            setSearchError('Ingrese el número de identificación');
            return;
        }

        setSearching(true);
        setSearchError('');

        try {
            const { data } = await patientService.getPatients({
                search: identificationNumber
            });

            if (data && data.length > 0) {
                const foundPatient = data[0];
                router.push(`/patients/${foundPatient.id}/edit`);
            } else {
                setSearchError('No se encontró ningún paciente con esa identificación');
            }
        } catch (error) {
            setSearchError('Error al buscar el paciente');
            console.error(error);
        } finally {
            setSearching(false);
        }
    };

    const handleClear = () => {
        setIdentificationType('');
        setIdentificationNumber('');
        setSearchError('');
        setPatientVerified(false);
        setPatient(undefined);
    };

    const handleDeletePatient = async () => {
        if (!patient?.id) throw new Error('Patient not found');
        await patientService.deletePatient(patient.id);
        handleClear();
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-lime-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageTitleCard
                title="Editar Paciente"
                description="Busque un paciente por identificación y actualice su información personal y de contacto."
                icon={UserRoundPen}
                accentColor="sky"
            />

            {/* Buscador de paciente */}
            <BaseCard variant="default" padding="lg">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2">
                        <Search className="w-5 h-5 text-lime-brand-600" />
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900">Buscar Paciente</h2>
                            <p className="text-sm text-neutral-500">Busque un paciente por identificación para editar su información.</p>
                        </div>
                    </div>
                    <PatientSearch
                        identificationType={identificationType}
                        identificationNumber={identificationNumber}
                        errorMessage={searchError}
                        patientVerified={patientVerified}
                        loading={searching}
                        onUpdateIdentificationType={setIdentificationType}
                        onUpdateIdentificationNumber={setIdentificationNumber}
                        onSearch={handleSearch}
                        onClear={handleClear}
                        createPatientHref="/patients/create"
                    />

                    {/* Mensaje cuando no hay paciente seleccionado */}
                    {!patient && !searchError && (
                        <div className="mt-4 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                            <Search className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-blue-800">Busque un paciente para editar</h3>
                            <p className="text-blue-600 text-sm mt-1">
                                Ingrese los datos del paciente en el campo de búsqueda arriba para cargar y editar su información.
                            </p>
                        </div>
                    )}
                </div>
            </BaseCard>

            {/* Formulario cuando paciente está cargado */}
            {patient && (
                <PatientForm
                    initialData={patient}
                    isEditMode={true}
                    onCloseSuccess={() => {
                        setPatient(undefined);
                        setPatientVerified(false);
                        setIdentificationType('');
                        setIdentificationNumber('');
                        setSearchError('');
                    }}
                    onCancel={() => {
                        setPatient(undefined);
                        setPatientVerified(false);
                        setIdentificationType('');
                        setIdentificationNumber('');
                        setSearchError('');
                    }}
                    onDelete={handleDeletePatient}
                />
            )}
        </div>
    );
}

export default function EditPatientPage() {
    const { id } = useParams() as { id: string };

    return <EditPatientPageContent patientId={id} />;
}
