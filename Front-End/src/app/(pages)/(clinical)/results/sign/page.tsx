'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/context/AuthContext';
import { PatientInfoCard, CaseInfoCard, CaseSearch } from '@/features/cases/components';
import { SignResultEditor, SignSuccessModal, AdditionalTestsModal, AssignPathologistModal, PendingSignCasesTable } from '@/features/results/components';
import { caseService } from '@/features/cases/services/case.service';
import { resultsService } from '@/features/results/services/results.service';
import { Case, SampleInfo } from '@/features/cases/types/case.types';
import { PageTitleCard } from '@/shared/components/ui/page-title';
import { BaseCard, BaseButton } from '@/shared/components/base';
import { Search, FileCheck, ClipboardList, SaveAll } from 'lucide-react';
import { ClearButton, PrintPdfButton } from '@/shared/components/ui/buttons';
import { openCasePdf as openCasePdfInNewTab } from '@/shared/utils/pdf';
import { Toast } from '@/shared/components/ui/Toast';
import type { ResultEditorSection, ResultSections, CIE10Diagnosis, CIEODiagnosis, ComplementaryTest } from '@/features/results/types/results.types';

const INITIAL_SECTIONS: ResultSections = {
    method: [''],
    macro: '',
    micro: '',
    diagnosis: '',
    diagnosisImages: [],
};

export default function SignResultsPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [caseCode, setCaseCode] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [caseFound, setCaseFound] = useState(false);
    const [caseData, setCaseData] = useState<Case | null>(null);
    const [samples, setSamples] = useState<SampleInfo[]>([]);
    const [sections, setSections] = useState<ResultSections>(INITIAL_SECTIONS);
    const [activeSection, setActiveSection] = useState<ResultEditorSection>('method');
    const [cie10, setCie10] = useState<CIE10Diagnosis | null>(null);
    const [cieo, setCieo] = useState<CIEODiagnosis | null>(null);
    const [complementaryTests, setComplementaryTests] = useState<ComplementaryTest[]>([{ code: '', name: '', quantity: 1 }]);
    const [complementaryTestsReason, setComplementaryTestsReason] = useState('');
    const [signing, setSigning] = useState(false);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
    const signBtnRef = useRef<HTMLDivElement>(null);

    const handleOpenCasePdf = () => {
        if (!caseData?.id) return;
        openCasePdfInNewTab(caseData.id);
    };
    const [showValidation, setShowValidation] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successVariant, setSuccessVariant] = useState<'progress' | 'signed'>('signed');
    const [showComplementaryModal, setShowComplementaryModal] = useState(false);
    const [showAssignPathologistModal, setShowAssignPathologistModal] = useState(false);
    const [assignModalMode, setAssignModalMode] = useState<'primary' | 'assistant'>('primary');
    const [savingComplementary, setSavingComplementary] = useState(false);
    const [successNotification, setSuccessNotification] = useState('');
    const [pendingCases, setPendingCases] = useState<Case[]>([]);

    useEffect(() => {
        const code = searchParams.get('case');
        if (code) {
            setCaseCode(code);
            handleSearchCase(code);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    useEffect(() => {
        if (!user?.name) return;
        caseService.getCases({ status: 'Por firmar', pathologist_name: user.name, limit: 50 })
            .then(res => setPendingCases(res.data))
            .catch(() => setPendingCases([]));
    }, [user?.name]);

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
            const resultData = data ? await resultsService.getCaseResult(toSearch) : null;

            if (data) {
                setCaseData(data);
                setSamples(data.samples || []);
                setCaseFound(true);
                setCaseCode(data.case_code);
                setSections(
                    resultData
                        ? { ...resultData, diagnosisImages: resultData.diagnosisImages ?? [] }
                        : { method: [''], macro: '', micro: '', diagnosis: '', diagnosisImages: [] }
                );
                setCie10(resultData?.cie10 ?? null);
                setCieo(resultData?.cieo ?? null);
                const ct = data.complementary_tests;
                setComplementaryTests(
                    ct?.length
                        ? ct.map((t) => ({ code: t.code, name: t.name, quantity: t.quantity ?? 1 }))
                        : [{ code: '', name: '', quantity: 1 }]
                );
                setComplementaryTestsReason(data.complementary_tests_reason ?? '');
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

    const handleClear = () => {
        setCaseCode('');
        setCaseFound(false);
        setCaseData(null);
        setSamples([]);
        setSearchError('');
        setSections(INITIAL_SECTIONS);
        setActiveSection('method');
        setCie10(null);
        setCieo(null);
        setComplementaryTests([{ code: '', name: '', quantity: 1 }]);
        setComplementaryTestsReason('');
        setShowValidation(false);
        setShowSuccessModal(false);
        setShowAssignPathologistModal(false);
        setSuccessVariant('signed');
    };

    const canSaveProgress = !!(
        (sections.method?.length && sections.method.some((m) => m?.trim())) ||
        sections.macro?.trim() ||
        sections.micro?.trim() ||
        sections.diagnosis?.trim()
    );

    const hasCie10 = !!(cie10?.code?.trim() && cie10?.name?.trim());
    const hasComplementaryRequest = complementaryTests.some((t) => t.code?.trim() || t.name?.trim());
    const validComplementaryTests =
        !hasComplementaryRequest ||
        (hasComplementaryRequest && complementaryTestsReason.trim().length > 0);

    const hasPathologist = !!(caseData?.assigned_pathologist?.id && caseData?.assigned_pathologist?.name);
    const isAdmin = ['administrator', 'administrador'].includes(String(user?.role ?? '').toLowerCase());
    const cannotEdit = (caseData?.status === 'Completado' && !isAdmin) || !hasPathologist;
    const isAssignedPathologist = !!(user?.id && caseData?.assigned_pathologist?.id && user.id === caseData.assigned_pathologist.id);
    const isAssistant = !!(user?.id && caseData?.assistant_pathologists?.some(a => a.id === user?.id));
    const canEditByRole = isAdmin || isAssignedPathologist || isAssistant;
    const cannotEditByRole = !canEditByRole;
    const canSignByRole = isAdmin || isAssignedPathologist;

    const missingFieldsSign: string[] = [];
    const methods = sections.method || [];
    if (!methods.length || methods.every((m) => !m?.trim())) {
        missingFieldsSign.push('Método');
    } else if (methods.some((m) => !m?.trim())) {
        missingFieldsSign.push('Métodos vacíos');
    }
    if (!sections.macro?.trim()) missingFieldsSign.push('Corte Macroscópico');
    if (!sections.micro?.trim()) missingFieldsSign.push('Descripción Microscópica');
    if (!sections.diagnosis?.trim()) missingFieldsSign.push('Diagnóstico');
    if (!hasCie10) missingFieldsSign.push('CIE-10');
    if (hasComplementaryRequest && !complementaryTestsReason.trim()) {
        missingFieldsSign.push('Motivo de la solicitud de pruebas adicionales');
    }
    if (hasComplementaryRequest && complementaryTests.filter((t) => t.code?.trim() || t.name?.trim()).length === 0) {
        missingFieldsSign.push('Datos de pruebas complementarias');
    }

    const signatureRequired = !isAdmin && canSignByRole && !user?.signature;
    const canSign = missingFieldsSign.length === 0 && hasPathologist && canSignByRole && !signatureRequired;

    const handleSaveProgress = async () => {
        if (!caseData?.case_code || !canSaveProgress) return;
        const validation = await resultsService.validateCaseForSaving(caseData.case_code, user?.id, user?.role);
        if (!validation.canEdit) {
            setSearchError(validation.message || 'Este caso no puede ser editado');
            return;
        }
        setSigning(true);
        setShowValidation(true);
        setSearchError('');
        try {
            // Guardar progreso debe permitir que el backend avance el estado (En recepción → Corte macro, etc.),
            // pero cuando todos los campos requeridos para firma están completos, no debe cambiar el estado a "Por firmar".
            const allRequiredFilled = missingFieldsSign.length === 0;
            const skipStateUpdate = allRequiredFilled;
            const updated = await resultsService.updateCaseResult(caseData.id, {
                method: sections.method?.filter((m) => m?.trim()),
                macro_result: sections.macro || undefined,
                micro_result: sections.micro || undefined,
                diagnosis: sections.diagnosis || undefined,
                cie10_diagnosis: cie10 ? { code: cie10.code, name: cie10.name } : null,
                cieo_diagnosis: cieo ? { code: cieo.code, name: cieo.name } : null,
                complementary_tests: hasComplementaryRequest ? complementaryTests.filter((t) => t.code?.trim() || t.name?.trim()) : undefined,
                complementary_tests_reason: hasComplementaryRequest ? complementaryTestsReason.trim() || undefined : undefined,
                diagnosisImages: sections.diagnosisImages ?? [],
                samples: samples,
            }, skipStateUpdate);
            if (updated) setCaseData(updated);
            setSuccessVariant('progress');
            setShowSuccessModal(true);
        } catch (error) {
            setSearchError(error instanceof Error ? error.message : 'Error al guardar');
        } finally {
            setSigning(false);
        }
    };

    const handleSign = async () => {
        if (!caseData?.case_code || !canSign) return;
        const validation = await resultsService.validateCaseForSigning(caseData.case_code, user?.id, user?.role);
        if (!validation.canSign) {
            setSearchError(validation.message || 'Este caso no puede ser firmado');
            return;
        }
        setSigning(true);
        setShowValidation(true);
        setSearchError('');
        try {
            const updated = await resultsService.signCase(caseData.case_code, {
                method: sections.method?.filter((m) => m?.trim()),
                macro_result: sections.macro || undefined,
                micro_result: sections.micro || undefined,
                diagnosis: sections.diagnosis || undefined,
                cie10: cie10 ? { code: cie10.code, name: cie10.name } : undefined,
                cieo: cieo ? { code: cieo.code, name: cieo.name } : undefined,
                complementaryTests: hasComplementaryRequest ? complementaryTests.filter((t) => t.code?.trim() || t.name?.trim()) : undefined,
                complementaryTestsReason: hasComplementaryRequest ? complementaryTestsReason.trim() || undefined : undefined,
                diagnosisImages: sections.diagnosisImages ?? [],
                samples: samples,
            });
            if (updated) setCaseData(updated);
            setSuccessVariant('signed');
            setShowSuccessModal(true);
        } catch (error) {
            setSearchError(error instanceof Error ? error.message : 'Error al firmar');
        } finally {
            setSigning(false);
        }
    };

    const handleSaveComplementaryRequest = async () => {
        if (!caseData?.id || !caseData?.case_code) return;
        setSavingComplementary(true);
        setSearchError('');
        try {
            const validTests = complementaryTests
                .filter((t) => t.code?.trim() || t.name?.trim())
                .map((t) => ({ ...t, code: t.code?.trim(), name: t.name?.trim() }));

            if (validTests.length === 0) {
                setSearchError('Debe agregar al menos una prueba adicional');
                return;
            }

            if (!complementaryTestsReason.trim()) {
                setSearchError('Debe ingresar el motivo de la solicitud');
                return;
            }

            const updated = await resultsService.createAdditionalTestsRequest(
                caseData.id,
                caseData.case_code,
                validTests,
                complementaryTestsReason.trim() || undefined,
            );
            if (updated) {
                setCaseData(updated);
                setSuccessNotification('Se ha generado la solicitud de pruebas adicionales para este caso');
                setShowComplementaryModal(false);
                await handleSearchCase(caseData.case_code);
            } else {
                setSearchError('No fue posible confirmar la actualización del caso');
            }
        } catch (error) {
            setSearchError(error instanceof Error ? error.message : 'Error al guardar la solicitud');
        } finally {
            setSavingComplementary(false);
        }
    };

    return (
        <div className="space-y-6">
            <Toast
                title="Solicitud creada"
                message={successNotification}
                visible={!!successNotification}
                variant="success"
                onDismiss={() => setSuccessNotification('')}
            />

            <PageTitleCard
                title="Firmar Resultados"
                description="Busque un caso por código para editar o firmar resultados. Se permiten casos en cualquier estado excepto Completado."
                icon={FileCheck}
                accentColor="emerald"
            />

            <BaseCard variant="default" padding="lg">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2">
                        <Search className="w-5 h-5 text-lime-brand-600" />
                        <div>
                            <h2 className="text-lg font-bold text-neutral-900">Buscar Caso</h2>
                            <p className="text-sm text-neutral-500">
                                Ingrese el código del caso para editar o firmar resultados (ej: 2026-00001).
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
                        <div className="mt-4">
                            <div className="flex items-center gap-2 mb-3">
                                <ClipboardList className="w-4 h-4 text-neutral-500" />
                                <span className="text-sm font-semibold text-neutral-700">
                                    Casos por firmar ({pendingCases.length})
                                </span>
                            </div>
                            <PendingSignCasesTable
                                cases={pendingCases}
                                onSelectCase={(code) => { setCaseCode(code); handleSearchCase(code); }}
                            />
                        </div>
                    )}
                </div>
            </BaseCard>

            {caseFound && caseData && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <SignResultEditor
                            sections={sections}
                            activeSection={activeSection}
                            onSectionsChange={setSections}
                            onActiveSectionChange={setActiveSection}
                            cie10={cie10}
                            cieo={cieo}
                            onCie10Change={setCie10}
                            onCieoChange={setCieo}
                            samples={samples}
                            onSamplesChange={setSamples}
                            showValidation={showValidation}
                            disabled={signing || cannotEdit}
                            assignedPathologist={caseData.assigned_pathologist?.name}
                            assistantPathologists={caseData.assistant_pathologists}
                            status={caseData.status}
                            onAssignPathologistClick={(caseData.status !== 'Completado' || isAdmin) ? () => {
                                setAssignModalMode('primary');
                                setShowAssignPathologistModal(true);
                            } : undefined}
                            onAddAssistantClick={(caseData.status !== 'Completado' || isAdmin) ? () => {
                                setAssignModalMode('assistant');
                                setShowAssignPathologistModal(true);
                            } : undefined}
                            footer={
                                <div className="flex flex-wrap items-center gap-3 justify-end">
                                    <ClearButton size="sm" onClick={handleClear} disabled={signing || cannotEdit} />
                                    <BaseButton
                                        size="sm"
                                        onClick={() => setShowComplementaryModal(true)}
                                        disabled={signing || cannotEdit}
                                        startIcon={<ClipboardList className="w-4 h-4" />}
                                        className="bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium text-xs h-9 px-3 py-1.5 shadow-none"
                                    >
                                        Crear solicitud de pruebas adicionales
                                    </BaseButton>
                                    <PrintPdfButton
                                        size="sm"
                                        text="Ver PDF"
                                        onClick={handleOpenCasePdf}
                                        disabled={!caseData?.id || signing}
                                    />
                                    <BaseButton
                                        size="sm"
                                        onClick={handleSaveProgress}
                                        disabled={!canSaveProgress || signing || cannotEdit}
                                        loading={signing}
                                        startIcon={<SaveAll className="w-4 h-4" />}
                                        className="bg-white border border-neutral-300 hover:bg-neutral-50 text-sky-600 font-medium text-xs h-9 px-3 py-1.5 shadow-none"
                                    >
                                        Guardar progreso
                                    </BaseButton>
                                    <div
                                        ref={signBtnRef}
                                        className="inline-flex"
                                        onMouseEnter={() => {
                                            if (!canSign || signing || cannotEdit) {
                                                const rect = signBtnRef.current?.getBoundingClientRect();
                                                if (rect) {
                                                    setTooltipPos({
                                                        top: rect.top - 8,
                                                        left: rect.left + rect.width / 2
                                                    });
                                                    setTooltipVisible(true);
                                                }
                                            }
                                        }}
                                        onMouseLeave={() => setTooltipVisible(false)}
                                    >
                                        {tooltipVisible && (!canSign || signing || cannotEdit) && typeof document !== 'undefined' && createPortal(
                                            <div
                                                role="tooltip"
                                                className="pointer-events-none px-5 py-3 min-w-[280px] bg-white text-neutral-900 text-sm font-medium rounded-xl shadow-lg border border-neutral-200"
                                                style={{
                                                    position: 'fixed',
                                                    top: tooltipPos.top,
                                                    left: tooltipPos.left,
                                                    transform: 'translate(-50%, -100%)',
                                                    zIndex: 99999
                                                }}
                                            >
                                                {signing ? (
                                                    'Guardando...'
                                                ) : !canSignByRole ? (
                                                    'Solo el administrador o el patólogo asignado pueden firmar este caso.'
                                                ) : !hasPathologist ? (
                                                    'Asigne un patólogo para poder editar o firmar.'
                                                ) : (caseData.status === 'Completado' && !isAdmin) ? (
                                                    'Los casos completados no permiten edición.'
                                                ) : (
                                                    <div className="text-left">
                                                        <p className="mb-2">Complete los siguientes campos:</p>
                                                        <ul className="list-disc list-inside space-y-1 text-neutral-700">
                                                            {missingFieldsSign.map((field) => (
                                                                <li key={field}>{field}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-white drop-shadow-[0_1px_0_rgba(0,0,0,0.05)]" />
                                            </div>,
                                            document.body
                                        )}
                                        <BaseButton
                                            size="sm"
                                            onClick={handleSign}
                                            disabled={!canSign || signing || (caseData.status === 'Completado' && !isAdmin)}
                                            loading={signing}
                                            startIcon={<FileCheck className="w-4 h-4" />}
                                            className="bg-white border border-neutral-300 hover:bg-neutral-50 text-emerald-600 font-medium text-xs h-9 px-3 py-1.5 shadow-none"
                                        >
                                            Firmar resultado
                                        </BaseButton>
                                    </div>
                                </div>
                            }
                        />

                        <AdditionalTestsModal
                            isOpen={showComplementaryModal}
                            onClose={() => setShowComplementaryModal(false)}
                            tests={complementaryTests}
                            onTestsChange={setComplementaryTests}
                            reason={complementaryTestsReason}
                            onReasonChange={setComplementaryTestsReason}
                            onSave={handleSaveComplementaryRequest}
                            saving={savingComplementary}
                            disabled={savingComplementary}
                        />
                        <SignSuccessModal
                            isOpen={showSuccessModal}
                            onClose={() => setShowSuccessModal(false)}
                            caseCode={caseData.case_code}
                            caseId={caseData.id}
                            sections={sections}
                            cie10={cie10}
                            cieo={cieo}
                            complementaryTests={complementaryTests}
                            complementaryTestsReason={complementaryTestsReason}
                            assignedPathologist={caseData.assigned_pathologist?.name}
                            currentAssistants={caseData.assistant_pathologists}
                            status={caseData.status}
                            variant={successVariant}
                            onAssignPathologistClick={() => setShowAssignPathologistModal(true)}
                            auditInfo={caseData.audit_info}
                        />
                        <AssignPathologistModal
                            isOpen={showAssignPathologistModal}
                            onClose={() => setShowAssignPathologistModal(false)}
                            caseId={caseData.id}
                            currentPathologist={caseData.assigned_pathologist}
                            currentAssistants={caseData.assistant_pathologists}
                            onAssigned={(p) => setCaseData((prev) => (prev ? { ...prev, assigned_pathologist: p } : null))}
                            onAssistantsUpdated={(assistants) => setCaseData((prev) => (prev ? { ...prev, assistant_pathologists: assistants } : null))}
                            mode={assignModalMode}
                        />

                        {!hasPathologist && (
                            <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                                <p className="text-sm font-bold text-amber-800">Patólogo requerido</p>
                                <p className="text-sm text-amber-700 mt-1">
                                    Asigne un patólogo al caso para poder editar o firmar los resultados.
                                </p>
                            </div>
                        )}
                        {hasPathologist && signatureRequired && (
                            <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                                <p className="text-sm font-bold text-amber-800">Firma requerida</p>
                                <p className="text-sm text-amber-700 mt-1">
                                    No tiene una firma registrada en su perfil. Suba su firma para poder firmar casos.
                                </p>
                            </div>
                        )}
                        {hasPathologist && caseData.status === 'Completado' && !isAdmin && (
                            <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                                <p className="text-sm font-bold text-red-800">Estado no válido para edición</p>
                                <p className="text-sm text-red-700 mt-1">
                                    Los casos en estado "Completado" no permiten edición ni firma.
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
