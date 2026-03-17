'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PatientInfoCard, CaseInfoCard, CaseSearch } from '@/features/cases/components';
import { TranscribeResultEditor, TranscribeSuccessModal, AssignPathologistModal } from '@/features/results/components';
import { caseService } from '@/features/cases/services/case.service';
import { resultsService } from '@/features/results/services/results.service';
import { Case } from '@/features/cases/types/case.types';
import { PageTitleCard } from '@/shared/components/ui/page-title';
import { BaseCard, BaseButton } from '@/shared/components/base';
import { PrintPdfButton } from '@/shared/components/ui/buttons';
import { openCasePdf as openCasePdfFile } from '@/shared/utils/pdf';
import { Search, FilePen, SaveAll, FileCheck } from 'lucide-react';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import type { ResultEditorSection, ResultSections } from '@/features/results/types/results.types';

const INITIAL_SECTIONS: ResultSections = {
    method: [''],
    macro: '',
    micro: '',
    cie10: null,
    cieo: null,
    diagnosis: '',
    diagnosisImages: [],
};

export default function TranscribeResultsPage() {
    const { isAdmin, isAuxiliar } = usePermissions();
    const searchParams = useSearchParams();
    const [caseCode, setCaseCode] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [caseFound, setCaseFound] = useState(false);
    const [caseData, setCaseData] = useState<Case | null>(null);
    const [sections, setSections] = useState<ResultSections>(INITIAL_SECTIONS);
    const [activeSection, setActiveSection] = useState<ResultEditorSection>('method');
    const [saving, setSaving] = useState(false);
    const [showValidation, setShowValidation] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successType, setSuccessType] = useState<'progress' | 'complete'>('progress');
    const [showAssignPathologistModal, setShowAssignPathologistModal] = useState(false);

    useEffect(() => {
        const code = searchParams.get('case');
        if (code) {
            setCaseCode(code);
            handleSearchCase(code);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const handleSearchCase = async (code?: string) => {
        const toSearch = code ?? caseCode.trim();
        if (!toSearch) {
            setSearchError('Por favor ingrese un código de caso');
            return;
        }

        setSearching(true);
        setSearchError('');

        try {
            const data = await caseService.getCaseByCode(toSearch);
            if (data) {
                setCaseData(data);
                setCaseFound(true);
                setCaseCode(data.case_code);
                if (data.result) {
                    const r = data.result as { method?: string[]; macro_result?: string; micro_result?: string; diagnosis?: string; cie10_diagnosis?: { code: string; name: string }; cieo_diagnosis?: { code: string; name: string }; diagnosis_images?: string[] };
                    const cie10 = r.cie10_diagnosis ? { code: r.cie10_diagnosis.code, name: r.cie10_diagnosis.name } : null;
                    const cieo = r.cieo_diagnosis ? { code: r.cieo_diagnosis.code, name: r.cieo_diagnosis.name } : null;
                    setSections({
                        method: r.method?.length ? r.method : [''],
                        macro: r.macro_result ?? '',
                        micro: r.micro_result ?? '',
                        diagnosis: r.diagnosis ?? '',
                        cie10,
                        cieo,
                        diagnosisImages: r.diagnosis_images ?? [],
                    });
                } else {
                    setSections(INITIAL_SECTIONS);
                }
            } else {
                setSearchError('No se encontró ningún caso con el código especificado');
                setCaseFound(false);
                setCaseData(null);
            }
        } catch (error) {
            setSearchError(error instanceof Error ? error.message : 'Error al buscar el caso');
            setCaseFound(false);
            setCaseData(null);
        } finally {
            setSearching(false);
        }
    };

    const openCasePdf = () => {
        if (!caseData?.id) return;
        openCasePdfFile(caseData.id);
    };

    const handleClear = () => {
        setCaseCode('');
        setCaseFound(false);
        setCaseData(null);
        setSearchError('');
        setSections(INITIAL_SECTIONS);
        setActiveSection('method');
        setShowValidation(false);
        setShowSuccessModal(false);
        setShowAssignPathologistModal(false);
    };

    const canSaveProgress = !!(
        (sections.method?.length && sections.method.some((m) => m?.trim())) ||
        sections.macro?.trim() ||
        sections.micro?.trim() ||
        sections.diagnosis?.trim()
    );

    const missingFields: string[] = [];
    const methods = sections.method || [];
    if (!methods.length || methods.every((m) => !m?.trim())) {
        missingFields.push('Método');
    } else if (methods.some((m) => !m?.trim())) {
        missingFields.push('Métodos vacíos');
    }
    if (!sections.macro?.trim()) missingFields.push('Corte Macroscópico');
    if (!sections.micro?.trim()) missingFields.push('Descripción Microscópica');
    if (!sections.diagnosis?.trim()) missingFields.push('Diagnóstico');
    const canComplete = missingFields.length === 0;

    const handleSave = async (complete: boolean) => {
        if (!caseData?.case_code) return;
        if (!canSaveProgress) return;
        if (complete && !canComplete) {
            setShowValidation(true);
            return;
        }

        const validation = await resultsService.validateCaseForTranscription(caseData.case_code);
        if (!validation.canEdit) {
            setSearchError(validation.message || 'Este caso no puede ser transcrito');
            return;
        }

        setSaving(true);
        setShowValidation(true);
        setSearchError('');

        try {
            // En Transcribir: máximo "Descrip micro" para patólogo/residente; auxiliar/admin sí puede dejar en "Por firmar".
            const canGoToPorFirmar = isAdmin || isAuxiliar;
            const skipStateUpdate = canComplete && !canGoToPorFirmar;
            const updated = await resultsService.updateCaseResult(caseData.id, {
                method: sections.method?.filter((m) => m?.trim()),
                macro_result: sections.macro || undefined,
                micro_result: sections.micro || undefined,
                diagnosis: sections.diagnosis || undefined,
                diagnosisImages: sections.diagnosisImages,
            }, skipStateUpdate);
            if (updated) setCaseData(updated);
            setSuccessType(complete ? 'complete' : 'progress');
            setShowSuccessModal(true);
        } catch (error) {
            setSearchError(error instanceof Error ? error.message : 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageTitleCard
                title="Transcribir Resultados"
                description="Busque un caso por código y transcriba los hallazgos macroscópicos, microscópicos y el diagnóstico."
                icon={FilePen}
                accentColor="sky"
            />

            <BaseCard variant="default" padding="lg">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2">
                        <Search className="w-5 h-5 text-lime-brand-600" />
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900">Buscar Caso</h2>
                            <p className="text-sm text-neutral-500">
                                Ingrese el código del caso para transcribir resultados (ej: 2026-00001).
                            </p>
                        </div>
                    </div>
                    <CaseSearch
                        caseCode={caseCode}
                        errorMessage={searchError}
                        caseVerified={caseFound}
                        loading={searching}
                        onUpdateCaseCode={setCaseCode}
                        onSearch={() => handleSearchCase()}
                        onClear={handleClear}
                    />

                    {!caseFound && !searchError && (
                        <div className="mt-4 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
                            <Search className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-blue-800">Busque un caso para transcribir</h3>
                            <p className="text-blue-600 text-sm mt-1">
                                Ingrese el código del caso en el campo de búsqueda para comenzar a transcribir los resultados.
                            </p>
                        </div>
                    )}
                </div>
            </BaseCard>

            {caseFound && caseData && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <TranscribeResultEditor
                            sections={sections}
                            activeSection={activeSection}
                            onSectionsChange={setSections}
                            onActiveSectionChange={setActiveSection}
                            showValidation={showValidation}
                            disabled={saving}
                            assignedPathologist={caseData.assigned_pathologist?.name}
                            assistantPathologists={caseData.assistant_pathologists}
                            status={caseData.status}
                            onAssignPathologistClick={() => setShowAssignPathologistModal(true)}
                            footer={
                                <div className="flex flex-wrap items-center gap-3 justify-end">
                                    <PrintPdfButton
                                        size="sm"
                                        onClick={openCasePdf}
                                        disabled={!caseData?.id}
                                        text="Imprimir PDF"
                                    />
                                    <BaseButton
                                        size="sm"
                                        onClick={() => handleSave(false)}
                                        disabled={!canSaveProgress || saving}
                                        loading={saving}
                                        startIcon={<SaveAll className="w-4 h-4" />}
                                        className="bg-white border border-neutral-300 hover:bg-neutral-50 text-sky-600 font-medium text-xs h-9 px-3 py-1.5 shadow-none"
                                    >
                                        Guardar Progreso
                                    </BaseButton>
                                    <div className="relative group inline-flex">
                                        {(!canComplete || saving) && (
                                            <div
                                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-5 py-3 min-w-[280px] bg-white text-neutral-900 text-sm font-medium rounded-xl shadow-elevation-md border border-neutral-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50"
                                                role="tooltip"
                                            >
                                                {saving ? (
                                                    'Guardando...'
                                                ) : (
                                                    <div className="text-left">
                                                        <p className="mb-2">Complete los siguientes campos:</p>
                                                        <ul className="list-disc list-inside space-y-1 text-neutral-700">
                                                            {missingFields.map((field) => (
                                                                <li key={field}>{field}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-white drop-shadow-[0_1px_0_rgba(0,0,0,0.05)]" />
                                            </div>
                                        )}
                                        <BaseButton
                                            size="sm"
                                            onClick={() => handleSave(true)}
                                            disabled={!canComplete || saving}
                                            loading={saving}
                                            startIcon={<FileCheck className="w-4 h-4" />}
                                            className="bg-white border border-neutral-300 hover:bg-neutral-50 text-emerald-600 font-medium text-xs h-9 px-3 py-1.5 shadow-none"
                                        >
                                            Completar para Firma
                                        </BaseButton>
                                    </div>
                                </div>
                            }
                        />

                        <TranscribeSuccessModal
                            isOpen={showSuccessModal}
                            onClose={() => setShowSuccessModal(false)}
                            caseCode={caseData.case_code}
                            caseId={caseData.id}
                            variant={successType}
                            sections={sections}
                            assignedPathologist={caseData.assigned_pathologist?.name}
                            currentAssistants={caseData.assistant_pathologists}
                            status={caseData.status}
                            auditInfo={caseData.audit_info}
                            onAssignPathologistClick={() => setShowAssignPathologistModal(true)}
                        />
                        <AssignPathologistModal
                            isOpen={showAssignPathologistModal}
                            onClose={() => setShowAssignPathologistModal(false)}
                            caseId={caseData.id}
                            currentPathologist={caseData.assigned_pathologist}
                            currentAssistants={caseData.assistant_pathologists}
                            onAssigned={(p) => setCaseData((prev) => (prev ? { ...prev, assigned_pathologist: p } : null))}
                            onAssistantsUpdated={(assistants) => setCaseData((prev) => (prev ? { ...prev, assistant_pathologists: assistants } : null))}
                        />

                        {caseData.status && (caseData.status === 'Por entregar' || caseData.status === 'Completado') && (
                            <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                                <p className="text-sm font-bold text-red-800">Estado no válido para transcripción</p>
                                <p className="text-sm text-red-700 mt-1">
                                    Los casos en estado "Por entregar" o "Completado" no permiten transcripción. Estado actual: {caseData.status}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="sticky top-4 space-y-6">
                            <PatientInfoCard
                                patient={caseData.patient}
                                badgeLabel="Verificado"
                                emptyStateMessage="Sin paciente"
                            />
                            <CaseInfoCard
                                caseData={caseData}
                                badgeLabel="Cargado"
                                emptyStateMessage="Sin caso"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
