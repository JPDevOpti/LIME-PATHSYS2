'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PatientSearch } from '@/features/patients/components/PatientSearch';
import { CaseForm, PatientInfoCard, CaseSuccessModal } from '@/features/cases/components';
import { patientService } from '@/features/patients/services/patient.service';
import { caseService } from '@/features/cases/services/case.service';
import { Patient } from '@/features/patients/types/patient.types';
import { CreateCaseRequest } from '@/features/cases/types/case.types';
import { Case, getDateFromDateInfo } from '@/features/cases/types/case.types';
import { PageTitleCard } from '@/shared/components/ui/page-title';
import { FilePlus, Search } from 'lucide-react';
import { BaseCard } from '@/shared/components/base/BaseCard';

export default function CreateCasePage() {
    const searchParams = useSearchParams();
    const [identificationType, setIdentificationType] = useState<string>('');
    const [identificationNumber, setIdentificationNumber] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [patientVerified, setPatientVerified] = useState(false);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [createdCase, setCreatedCase] = useState<Case | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Prefill desde query params (ej: desde PatientSuccessModal "Crear caso")
    useEffect(() => {
        const patientId = searchParams.get('patientId');
        if (patientId) {
            const load = async () => {
                try {
                    const data = await patientService.getPatientById(patientId);
                    if (data) {
                        setIdentificationType(data.identification_type || '');
                        setIdentificationNumber(data.identification_number || '');
                        setPatient(data);
                        setPatientVerified(true);
                        setSearchError('');
                    }
                } catch {
                    // Ignorar
                }
            };
            load();
        }
    }, [searchParams]);

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

            const match = data?.find(
                p =>
                    String(p.identification_type) === String(identificationType) &&
                    String(p.identification_number) === String(identificationNumber)
            );

            if (match) {
                setPatient(match);
                setPatientVerified(true);
            } else {
                setSearchError('No se encontró un paciente con la identificación especificada');
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
        setPatient(null);
    };

    const handleSubmitCase = async (formData: CreateCaseRequest) => {
        if (!patient?.id) throw new Error('Debe verificar un paciente primero');
        const caseData = await caseService.createCase(formData, patient);
        setCreatedCase(caseData);
        setShowSuccessModal(true);
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        setCreatedCase(null);
        handleClear();
    };

    return (
        <div className="space-y-6">
            <PageTitleCard
                title="Crear Caso"
                description="Busque y verifique el paciente antes de crear el caso médico. Complete el formulario con los datos del caso."
                icon={FilePlus}
                accentColor="emerald"
            />

            {/* Buscador de paciente */}
            <BaseCard variant="default" padding="lg">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2">
                        <Search className="w-5 h-5 text-lime-brand-600" />
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900">Buscar Paciente</h2>
                            <p className="text-sm text-neutral-500">Busque y verifique el paciente antes de crear el caso médico.</p>
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

                    {/* Mensaje cuando no hay paciente verificado */}
                    {!patientVerified && !searchError && (
                        <div className="mt-4 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                            <Search className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-blue-800">Busque un paciente para crear un caso</h3>
                            <p className="text-blue-600 text-sm mt-1">
                                Ingrese los datos del paciente en el campo de búsqueda arriba para comenzar a crear un nuevo caso médico
                            </p>
                        </div>
                    )}
                </div>
            </BaseCard>

            {/* Formulario y card de paciente cuando está verificado */}
            {patientVerified && patient && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                    <div className="lg:col-span-3">
                        <CaseForm
                            key={`${patient.id}-${patient.audit_info?.[patient.audit_info.length - 1]?.timestamp || 'initial'}`}
                            patientId={patient.id!}
                            onSubmit={handleSubmitCase}
                            onClear={handleClear}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <div className="sticky top-4">
                            <PatientInfoCard
                                key={`${patient.id}-${patient.audit_info?.[patient.audit_info.length - 1]?.timestamp || 'initial'}`}
                                patient={patient}
                                emptyStateMessage="No hay paciente verificado"
                                emptyStateSubtext="Busque un paciente para continuar"
                                lastCaseCreatedAt={getDateFromDateInfo(createdCase?.date_info, 'created_at')}
                                editable
                                onPatientUpdated={setPatient}
                                hideCrearCasoLink
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de éxito */}
            {createdCase && (
                <CaseSuccessModal
                    isOpen={showSuccessModal}
                    onClose={handleCloseSuccessModal}
                    caseData={createdCase}
                />
            )}

        </div>
    );
}
