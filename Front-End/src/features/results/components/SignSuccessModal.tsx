'use client';

import { SuccessModal } from '@/shared/components/overlay/SuccessModal';
import { CloseButton } from '@/shared/components/ui/buttons';
import { sanitizeHtml } from '@/shared/utils/sanitizeHtml';
import type { ResultSections } from '@/features/results/types/results.types';
import type { CIE10Diagnosis, CIEODiagnosis, ComplementaryTest } from '@/features/results/types/results.types';
import type { AuditEntry } from '@/features/cases/types/case.types';

function formatAuditDate(ts?: string): string {
    if (!ts) return '';
    try {
        return new Date(ts).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return ts;
    }
}

function getLastUpdatedMeta(auditInfo?: AuditEntry[] | null): string | null {
    if (!auditInfo?.length) return null;
    const last = auditInfo.filter((e) => e.action !== 'created').pop();
    if (!last) return null;
    const who = last.user_name || last.user_email;
    return `Guardado por ${who} el ${formatAuditDate(last.timestamp)}`;
}

interface SignSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseCode: string;
    caseId?: string;
    sections: ResultSections;
    cie10: CIE10Diagnosis | null;
    cieo: CIEODiagnosis | null;
    complementaryTests: ComplementaryTest[];
    complementaryTestsReason: string;
    assignedPathologist?: string | null;
    currentAssistants?: { id: string; name: string }[] | null;
    status?: string | null;
    variant?: 'progress' | 'signed';
    onAssignPathologistClick?: () => void;
    auditInfo?: AuditEntry[] | null;
}

export function SignSuccessModal({
    isOpen,
    onClose,
    caseCode,
    caseId,
    sections,
    cie10,
    cieo,
    complementaryTests,
    complementaryTestsReason,
    assignedPathologist,
    currentAssistants,
    status,
    variant = 'signed',
    onAssignPathologistClick,
    auditInfo,
}: SignSuccessModalProps) {
    const metaText = getLastUpdatedMeta(auditInfo);
    const methods = sections.method?.filter((m) => m?.trim()) ?? [];
    const methodsText = methods.length > 0 ? methods.join(', ') : '—';
    const safeMacro = sanitizeHtml(sections.macro?.trim() ?? '');
    const safeMicro = sanitizeHtml(sections.micro?.trim() ?? '');
    const safeDiagnosis = sanitizeHtml(sections.diagnosis?.trim() ?? '');

    const statusStyles =
        status === 'En recepción'
            ? 'bg-blue-50 border-blue-200 text-blue-800'
            : status === 'Corte macro'
                ? 'bg-cyan-50 border-cyan-200 text-cyan-800'
                : status === 'Descrip micro'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                    : status === 'Por firmar'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : status === 'Por entregar'
                            ? 'bg-violet-50 border-violet-200 text-violet-800'
                            : status === 'Completado'
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-neutral-50 border-neutral-200 text-neutral-800';

    const statusDotClass =
        status === 'En recepción'
            ? 'bg-blue-500'
            : status === 'Corte macro'
                ? 'bg-cyan-500'
                : status === 'Descrip micro'
                    ? 'bg-indigo-500'
                    : status === 'Por firmar'
                        ? 'bg-amber-500'
                        : status === 'Por entregar'
                            ? 'bg-violet-500'
                            : status === 'Completado'
                                ? 'bg-green-500'
                                : 'bg-neutral-500';

    const headerRight = (
        <div className="flex flex-col gap-1 items-end text-right">
            {status && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${statusStyles}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                    {status}
                </span>
            )}
            {assignedPathologist ? (
                <div className="flex flex-col items-end gap-1">
                    {onAssignPathologistClick ? (
                        <button
                            type="button"
                            onClick={onAssignPathologistClick}
                            className="text-neutral-900 font-medium text-sm hover:text-lime-brand-600 hover:underline cursor-pointer"
                        >
                            {assignedPathologist}
                        </button>
                    ) : (
                        <p className="text-neutral-900 font-medium text-sm">{assignedPathologist}</p>
                    )}
                    {currentAssistants && currentAssistants.length > 0 && (
                        <div className="flex flex-col gap-1 items-end">
                            {currentAssistants.map((a, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 block w-fit"
                                    title={`Asistente: ${a.name}`}
                                >
                                    {a.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ) : onAssignPathologistClick ? (
                <button
                    type="button"
                    onClick={onAssignPathologistClick}
                    className="text-red-600 font-medium text-sm hover:text-red-700 underline cursor-pointer"
                >
                    sin patólogo
                </button>
            ) : (
                <p className="text-red-600 font-medium text-sm">sin patólogo</p>
            )}
        </div>
    );

    const isSigned = variant === 'signed';
    return (
        <SuccessModal
            isOpen={isOpen}
            onClose={onClose}
            title={isSigned ? 'Resultado firmado' : 'Progreso guardado'}
            description={
                isSigned ? (
                    <>
                        El caso <span className="font-semibold text-green-600">{caseCode}</span> ha sido firmado correctamente.
                    </>
                ) : (
                    <>
                        El progreso del caso <span className="font-semibold text-blue-600">{caseCode}</span> se ha guardado correctamente.
                    </>
                )
            }
            variant={isSigned ? 'create' : 'edit'}
            size="4xl"
            footer={
                <div className="flex justify-between items-center gap-4 w-full">
                    {metaText ? (
                        <span className="text-sm text-neutral-500">{metaText}</span>
                    ) : (
                        <span />
                    )}
                    <CloseButton onClick={onClose} />
                </div>
            }
            headerRight={headerRight}
        >
            <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 gap-4 text-sm border-t border-neutral-200 pt-4">
                    <div>
                        <h5 className="font-medium text-neutral-700 mb-1">Método</h5>
                        <div className="text-neutral-900 whitespace-pre-wrap break-words overflow-hidden bg-neutral-50 border border-neutral-200 rounded-lg p-3 min-h-[40px] max-w-full">
                            {methodsText}
                        </div>
                    </div>
                    <div>
                        <h5 className="font-medium text-neutral-700 mb-1">Corte Macroscópico</h5>
                        <div
                            className="result-content-display text-neutral-900 break-words overflow-hidden bg-neutral-50 border border-neutral-200 rounded-lg p-3 min-h-[40px] max-w-full text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: safeMacro || '—' }}
                        />
                    </div>
                    <div>
                        <h5 className="font-medium text-neutral-700 mb-1">Descripción Microscópica</h5>
                        <div
                            className="result-content-display text-neutral-900 break-words overflow-hidden bg-neutral-50 border border-neutral-200 rounded-lg p-3 min-h-[40px] max-w-full text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: safeMicro || '—' }}
                        />
                    </div>
                    <div>
                        <h5 className="font-medium text-neutral-700 mb-1">Diagnóstico</h5>
                        <div
                            className="result-content-display text-neutral-900 break-words overflow-hidden bg-neutral-50 border border-neutral-200 rounded-lg p-3 min-h-[40px] max-w-full text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: safeDiagnosis || '—' }}
                        />
                    </div>

                    {cie10 && (cie10.code || cie10.name) && (
                        <div>
                            <h5 className="font-medium text-neutral-700 mb-1">CIE-10</h5>
                            <div className="text-neutral-900 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                                <span className="font-mono text-sm text-neutral-600">{cie10.code}</span>
                                {cie10.code && cie10.name && ' - '}
                                <span className="text-sm">{cie10.name}</span>
                            </div>
                        </div>
                    )}

                    {cieo && (cieo.code || cieo.name) && (
                        <div>
                            <h5 className="font-medium text-neutral-700 mb-1">CIE-O</h5>
                            <div className="text-neutral-900 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                                <span className="font-mono text-sm text-neutral-600">{cieo.code}</span>
                                {cieo.code && cieo.name && ' - '}
                                <span className="text-sm">{cieo.name}</span>
                            </div>
                        </div>
                    )}

                    {complementaryTests.length > 0 && complementaryTests.some((t) => t.code || t.name) && (
                        <div>
                            <h5 className="font-medium text-neutral-700 mb-1">Pruebas complementarias solicitadas</h5>
                            <div className="space-y-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                                {complementaryTests
                                    .filter((t) => t.code || t.name)
                                    .map((t, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm">
                                            <span>
                                                {t.code} - {t.name}
                                                {t.quantity > 1 && ` (x${t.quantity})`}
                                            </span>
                                        </div>
                                    ))}
                                {complementaryTestsReason.trim() && (
                                    <div className="pt-2 border-t border-orange-200">
                                        <p className="text-xs text-neutral-600 mb-1">Motivo:</p>
                                        <p className="text-sm text-neutral-800">{complementaryTestsReason}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SuccessModal>
    );
}
