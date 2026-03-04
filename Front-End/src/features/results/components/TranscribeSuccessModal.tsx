'use client';

import { SuccessModal } from '@/shared/components/overlay/SuccessModal';
import { CloseButton } from '@/shared/components/ui/buttons';
import { sanitizeHtml } from '@/shared/utils/sanitizeHtml';
import type { SuccessModalVariant } from '@/shared/components/overlay/SuccessModal';
import type { ResultSections } from '@/features/results/types/results.types';
import type { AuditEntry } from '@/features/cases/types/case.types';

interface TranscribeSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseCode: string;
    caseId?: string;
    variant: 'progress' | 'complete';
    sections: ResultSections;
    assignedPathologist?: string | null;
    status?: string | null;
    auditInfo?: AuditEntry[] | null;
    currentAssistants?: { id: string; name: string }[] | null;
    onAssignPathologistClick?: () => void;
}

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

export function TranscribeSuccessModal({
    isOpen,
    onClose,
    caseCode,
    caseId,
    variant,
    sections,
    assignedPathologist,
    status,
    auditInfo,
    currentAssistants,
    onAssignPathologistClick,
}: TranscribeSuccessModalProps) {
    const metaText = getLastUpdatedMeta(auditInfo);
    const modalVariant: SuccessModalVariant = variant === 'progress' ? 'edit' : 'create';
    const title = variant === 'progress' ? 'Progreso guardado' : 'Listo para firma';
    const description =
        variant === 'progress' ? (
            <>
                El progreso del caso <span className="font-semibold text-blue-600">{caseCode}</span> se ha guardado correctamente.
            </>
        ) : (
            <>
                El caso <span className="font-semibold text-green-600">{caseCode}</span> ha sido completado y está listo para firma.
            </>
        );

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

    return (
        <SuccessModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={description}
            variant={modalVariant}
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
                {variant === 'complete' && (
                    <p className="text-sm text-neutral-600">
                        El caso ya está disponible en la sección de firmar resultados.
                    </p>
                )}

                <div className="grid grid-cols-1 gap-4 text-sm border-t border-neutral-200 pt-4">
                    <div>
                        <h5 className="font-medium text-neutral-700 mb-1">Método</h5>
                        <div className="text-neutral-900 whitespace-pre-wrap break-words overflow-hidden bg-neutral-50 border border-neutral-200 rounded-lg p-3 min-h-[60px] max-w-full">
                            {methodsText}
                        </div>
                    </div>
                    <div>
                        <h5 className="font-medium text-neutral-700 mb-1">Corte Macroscópico</h5>
                        <div
                            className="result-content-display text-neutral-900 break-words overflow-hidden bg-neutral-50 border border-neutral-200 rounded-lg p-3 min-h-[60px] max-w-full text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: safeMacro || '—' }}
                        />
                    </div>
                    <div>
                        <h5 className="font-medium text-neutral-700 mb-1">Descripción Microscópica</h5>
                        <div
                            className="result-content-display text-neutral-900 break-words overflow-hidden bg-neutral-50 border border-neutral-200 rounded-lg p-3 min-h-[60px] max-w-full text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: safeMicro || '—' }}
                        />
                    </div>
                    {sections.cie10 && (sections.cie10.code || sections.cie10.name) && (
                        <div>
                            <h5 className="font-medium text-neutral-700 mb-1">CIE-10</h5>
                            <div className="text-neutral-900 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                                <span className="font-mono text-sm text-neutral-600">{sections.cie10.code}</span>
                                {sections.cie10.code && sections.cie10.name && ' - '}
                                <span className="text-sm">{sections.cie10.name}</span>
                            </div>
                        </div>
                    )}
                    {sections.cieo && (sections.cieo.code || sections.cieo.name) && (
                        <div>
                            <h5 className="font-medium text-neutral-700 mb-1">CIE-O</h5>
                            <div className="text-neutral-900 bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                                <span className="font-mono text-sm text-neutral-600">{sections.cieo.code}</span>
                                {sections.cieo.code && sections.cieo.name && ' - '}
                                <span className="text-sm">{sections.cieo.name}</span>
                            </div>
                        </div>
                    )}
                    <div>
                        <h5 className="font-medium text-neutral-700 mb-1">Diagnóstico</h5>
                        <div
                            className="result-content-display text-neutral-900 break-words overflow-hidden bg-neutral-50 border border-neutral-200 rounded-lg p-3 min-h-[60px] max-w-full text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: safeDiagnosis || '—' }}
                        />
                    </div>
                </div>
            </div>
        </SuccessModal>
    );
}
