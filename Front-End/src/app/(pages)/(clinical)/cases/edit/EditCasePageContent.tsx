'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CaseSearch, CaseForm, PatientInfoCard, CaseSuccessModal } from '@/features/cases/components';
import { caseService } from '@/features/cases/services/case.service';
import { Case, getDateFromDateInfo } from '@/features/cases/types/case.types';
import { UpdateCaseRequest } from '@/features/cases/types/case.types';
import { PageTitleCard } from '@/shared/components/ui/page-title';
import { FilePen, Search } from 'lucide-react';
import { BaseCard } from '@/shared/components/base/BaseCard';

type EditCasePageContentProps = {
    caseId?: string;
};

export function EditCasePageContent({ caseId }: EditCasePageContentProps) {
    const searchParams = useSearchParams();
    const effectiveCaseId = caseId ?? searchParams.get('id') ?? undefined;

    const [caseCode, setCaseCode] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [caseVerified, setCaseVerified] = useState(false);
    const [caseData, setCaseData] = useState<Case | null>(null);
    const [updatedCase, setUpdatedCase] = useState<Case | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        if (effectiveCaseId) {
            const load = async () => {
                try {
                    const data = await caseService.getCaseById(effectiveCaseId);
                    if (data) {
                        setCaseData(data);
                        setCaseVerified(true);
                        setCaseCode(data.case_code);
                        setSearchError('');
                    }
                } catch {
                    // Ignorar
                }
            };
            load();
        }
    }, [effectiveCaseId]);

    const handleSearch = async () => {
        if (!caseCode.trim()) {
            setSearchError('Ingrese un código de caso');
            return;
        }

        setSearching(true);
        setSearchError('');

        try {
            const found = await caseService.getCaseByCode(caseCode);
            if (found) {
                setCaseData(found);
                setCaseVerified(true);
            } else {
                setSearchError('No se encontró un caso con el código especificado');
            }
        } catch (error) {
            setSearchError('Error al buscar el caso');
            console.error(error);
        } finally {
            setSearching(false);
        }
    };

    const handleClear = () => {
        setCaseCode('');
        setSearchError('');
        setCaseVerified(false);
        setCaseData(null);
    };

    const handleSubmitCase = async (formData: UpdateCaseRequest) => {
        if (!caseData?.id) throw new Error('Case not found');
        const result = await caseService.updateCase(caseData.id, formData);
        setUpdatedCase(result);
        setCaseData(result);
        setShowSuccessModal(true);
    };

    const handleDeleteCase = async () => {
        if (!caseData?.id) throw new Error('Case not found');
        await caseService.deleteCase(caseData.id);
        handleClear();
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        setUpdatedCase(null);
        handleClear();
    };

    return (
        <div className="space-y-6">
            <PageTitleCard
                title="Editar Caso"
                description="Busque un caso por código y actualice su información. Verifique el caso antes de realizar cambios."
                icon={FilePen}
                accentColor="sky"
            />

            <BaseCard variant="default" padding="lg">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2">
                        <Search className="w-5 h-5 text-lime-brand-600" />
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900">Buscar Caso</h2>
                            <p className="text-sm text-neutral-500">Busque y verifique el caso antes de editar.</p>
                        </div>
                    </div>
                    <CaseSearch
                        caseCode={caseCode}
                        errorMessage={searchError}
                        caseVerified={caseVerified}
                        loading={searching}
                        onUpdateCaseCode={setCaseCode}
                        onSearch={handleSearch}
                        onClear={handleClear}
                    />

                    {!caseVerified && !searchError && (
                        <div className="mt-4 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                            <Search className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-blue-800">Search for a case to edit</h3>
                            <p className="text-blue-600 text-sm mt-1">
                                Enter the case code in the search field above to edit case information
                            </p>
                        </div>
                    )}
                </div>
            </BaseCard>

            {caseVerified && caseData && caseData.patient && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                    <div className="lg:col-span-3">
                        <CaseForm
                            key={`${caseData.id}-${caseData.patient.id}-${caseData.patient.audit_info?.[caseData.patient.audit_info.length - 1]?.timestamp || 'initial'}`}
                            initialData={caseData}
                            onSubmit={handleSubmitCase}
                            onClear={handleClear}
                            onDelete={handleDeleteCase}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <div className="sticky top-4">
                            <PatientInfoCard
                                key={`${caseData.patient.id}-${caseData.patient.audit_info?.[caseData.patient.audit_info.length - 1]?.timestamp || 'initial'}`}
                                patient={caseData.patient}
                                badgeLabel="Verificado"
                                emptyStateMessage="No hay información del paciente"
                                emptyStateSubtext="Busque un caso para continuar"
                                lastCaseCreatedAt={getDateFromDateInfo(updatedCase?.date_info, 'created_at')}
                                editable
                                onPatientUpdated={(updatedPatient) => setCaseData(prev => prev ? {
                                    ...prev,
                                    patient: updatedPatient,
                                    entity: updatedPatient.entity_info?.entity_name
                                        ? { id: prev.entity?.id || '', name: updatedPatient.entity_info.entity_name }
                                        : prev.entity
                                } : null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {updatedCase && (
                <CaseSuccessModal
                    isOpen={showSuccessModal}
                    onClose={handleCloseSuccessModal}
                    caseData={updatedCase}
                    variant="edit"
                />
            )}
        </div>
    );
}