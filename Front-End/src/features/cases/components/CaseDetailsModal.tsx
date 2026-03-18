'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Case, getDateFromDateInfo } from '../types/case.types';
import { caseService } from '../services/case.service';
import { AssignPathologistModal } from '@/features/results/components';
import { BODY_REGION_OPTIONS, TEST_OPTIONS } from '../data/case-options';
import { SuccessModal } from '@/shared/components/overlay/SuccessModal';
import { CloseButton } from '@/shared/components/ui/buttons';
import { BaseCard } from '@/shared/components/base/BaseCard';
import { FileText, User, Phone, MapPin, Building2, FlaskConical, UserRoundPen, History, ShieldCheck, Microscope, ZoomIn, ChevronLeft, ChevronRight, X as XIcon, Image, NotebookPen } from 'lucide-react';
import { formatAge } from '@/shared/utils/formatAge';
import { sanitizeHtml } from '@/shared/utils/sanitizeHtml';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { AddNoteModal } from './AddNoteModal';

interface CaseDetailsModalProps {
    visible: boolean;
    caseData: Case | null;
    onClose: () => void;
    onCaseUpdated?: (caseData: Case) => void;
}

const priorityLabels: Record<string, string> = {
    normal: 'Normal',
    prioritario: 'Prioritario'
};

const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    return date.toLocaleString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return undefined;
    return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

function getStatusBadgeClass(status?: string): string {
    if (status === 'Completado') return 'bg-green-100 text-green-800';
    if (status === 'Por entregar') return 'bg-red-100 text-red-800 font-medium';
    if (status === 'Por firmar') return 'bg-amber-100 text-amber-800';
    if (status === 'Descrip micro') return 'bg-indigo-100 text-indigo-800';
    if (status === 'Corte macro') return 'bg-cyan-100 text-cyan-800';
    if (status === 'En recepción') return 'bg-blue-100 text-blue-800';
    return 'bg-neutral-100 text-neutral-600';
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
    created: 'Creado',
    edited: 'Editado',
    delivered: 'Entregado',
    signed: 'Firmado',
    transcribed: 'Transcrito',
};

const InfoItem = ({ label, value }: { label: string; value?: string | number | boolean }) => {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    return (
        <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-neutral-500">{label}</p>
            <p className="text-sm text-neutral-900 break-all">
                {value === true ? 'Sí' : value === false ? 'No' : value}
            </p>
        </div>
    );
};

const PatientSection = ({
    icon: Icon,
    sectionTitle,
    children
}: {
    icon: React.ElementType;
    sectionTitle: string;
    children: React.ReactNode;
}) => (
    <BaseCard variant="muted" padding="md" className="bg-white">
        <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2">
                <Icon className="w-5 h-5 text-lime-brand-600" />
                <h4 className="text-sm font-semibold text-neutral-700">{sectionTitle}</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {children}
            </div>
        </div>
    </BaseCard>
);

export function CaseDetailsModal({ visible, caseData, onClose, onCaseUpdated }: CaseDetailsModalProps) {
    const { isPatologo, isAdmin } = usePermissions();
    const [previousCases, setPreviousCases] = useState<Case[]>([]);
    const [showAssignPathologistModal, setShowAssignPathologistModal] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const diagImages = caseData?.result?.diagnosis_images ?? [];

    const lightboxPrev = () => setLightboxIndex(i => (i! > 0 ? i! - 1 : diagImages.length - 1));
    const lightboxNext = () => setLightboxIndex(i => (i! < diagImages.length - 1 ? i! + 1 : 0));

    useEffect(() => {
        if (!visible || !caseData?.patient?.id) {
            setPreviousCases([]);
            return;
        }
        caseService.getCasesByPatientId(caseData.patient.id).then(data => {
            const others = data.filter(c => c.id !== caseData.id);
            setPreviousCases(others);
        }).catch(() => setPreviousCases([]));
    }, [visible, caseData?.id, caseData?.patient?.id]);

    if (!caseData) return null;

    const patient = caseData.patient;
    const hasAdditionalTestsRequest = Boolean(caseData.complementary_tests && caseData.complementary_tests.length > 0);
    const additionalTestsReason = caseData.complementary_tests_reason?.trim();

    const modalTitle = (
        <div className="space-y-1">
            <p className="text-3xl font-bold tracking-tight text-blue-600">{caseData.case_code}</p>
            <p className="text-lg font-medium text-neutral-700">Detalles del Caso</p>
        </div>
    );

    const headerRight = (
        <div className="flex flex-col items-end gap-2">
            {caseData.status && (
                <span className={`inline-flex rounded-full px-4 py-2 text-base font-medium ${getStatusBadgeClass(caseData.status)}`}>
                    {caseData.status}
                </span>
            )}
            <button
                type="button"
                onClick={() => setShowAssignPathologistModal(true)}
                className={`text-lg font-medium text-left hover:underline cursor-pointer transition-colors ${caseData.assigned_pathologist?.name ? 'text-neutral-900' : 'text-red-600'
                    }`}
            >
                {caseData.assigned_pathologist?.name ?? 'Sin patólogo'}
            </button>
        </div>
    );

    return (
        <>
        <SuccessModal
            isOpen={visible}
            onClose={onClose}
            title={modalTitle}
            description={formatDateTime(getDateFromDateInfo(caseData.date_info, 'created_at')) ?? ''}
            variant="edit"
            size="5xl"
            headerRight={headerRight}
            footer={
                <div className="w-full flex justify-end items-center gap-4 flex-wrap">
                    <div className="flex gap-3 shrink-0">
                        {isAdmin && caseData.status === 'Completado' && (
                            <button
                                type="button"
                                onClick={() => setShowNoteModal(true)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-amber-500 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 transition-colors"
                            >
                                <NotebookPen className="w-4 h-4" />
                                Agregar nota
                            </button>
                        )}
                        {!isPatologo && (
                            <Link
                                href={caseData.id ? `/cases/edit?id=${encodeURIComponent(caseData.id)}` : '#'}
                                onClick={onClose}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                <UserRoundPen className="w-4 h-4" />
                                Editar
                            </Link>
                        )}
                        <CloseButton onClick={onClose} />
                    </div>
                </div>
            }
        >
            {caseData.id && (
                <AssignPathologistModal
                    isOpen={showAssignPathologistModal}
                    onClose={() => setShowAssignPathologistModal(false)}
                    caseId={caseData.id}
                    currentPathologist={caseData.assigned_pathologist}
                    onAssigned={(pathologist) => {
                        const updated = { ...caseData, assigned_pathologist: pathologist };
                        onCaseUpdated?.(updated);
                    }}
                />
            )}
            <div className="space-y-6">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-6 space-y-6">
                    <BaseCard variant="muted" padding="md" className="bg-white">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2">
                                <FileText className="w-5 h-5 text-lime-brand-600" />
                                <h4 className="text-sm font-semibold text-neutral-700">
                                    Información del Caso
                                </h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs font-medium text-neutral-500">Código del Caso</p>
                                    <p className="text-sm font-semibold text-neutral-900">{caseData.case_code}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-neutral-500">Prioridad</p>
                                    <p className="text-sm text-neutral-900">
                                        {priorityLabels[caseData.priority] ?? caseData.priority}
                                    </p>
                                </div>
                                {caseData.status && (
                                    <div>
                                        <p className="text-xs font-medium text-neutral-500">Estado</p>
                                        <p className="text-sm text-neutral-900">{caseData.status}</p>
                                    </div>
                                )}
                                <InfoItem label="Servicio" value={caseData.service} />
                                <InfoItem label="Entidad" value={caseData.entity?.name} />
                                <InfoItem
                                    label="Solicitud de pruebas adicionales"
                                    value={hasAdditionalTestsRequest ? 'Sí' : 'No'}
                                />
                                <div>
                                    <p className="text-xs font-medium text-neutral-500">Médico remitente</p>
                                    <p className="text-sm text-neutral-900">{caseData.doctor}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-200">
                                <div className="sm:col-span-2 lg:col-span-2">
                                    <p className="text-xs font-medium text-neutral-500">Observaciones</p>
                                    <p className="text-sm text-neutral-900 whitespace-pre-wrap">
                                        {caseData.observations || 'Sin datos'}
                                    </p>
                                </div>

                                {hasAdditionalTestsRequest && (
                                    <div className="sm:col-span-2 lg:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                                            Solicitud de pruebas adicionales
                                        </p>

                                        <p className="mt-2 text-xs font-medium text-neutral-500">Pruebas solicitadas</p>
                                        <div className="mt-1 flex flex-wrap gap-2">
                                            {(caseData.complementary_tests || []).map((t, idx) => (
                                                <span
                                                    key={`${t.code}-${idx}`}
                                                    className="inline-flex items-center rounded-md border border-amber-200 bg-white px-2 py-1 text-xs font-medium text-amber-800"
                                                >
                                                    {t.code} - {t.name} (x{t.quantity})
                                                </span>
                                            ))}
                                        </div>

                                        <p className="mt-3 text-xs font-medium text-neutral-500">Motivo</p>
                                        <p className="text-sm text-neutral-900 whitespace-pre-wrap">
                                            {additionalTestsReason || 'Sin motivo registrado'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </BaseCard>

                    {caseData.samples && caseData.samples.length > 0 && (
                        <BaseCard variant="muted" padding="md" className="bg-white">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-2">
                                    <FlaskConical className="w-5 h-5 text-lime-brand-600" />
                                    <h4 className="text-sm font-semibold text-neutral-700">Muestras</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {caseData.samples.map((s, i) => (
                                        <div
                                            key={i}
                                            className="bg-neutral-50 rounded p-2 border border-neutral-200"
                                        >
                                            <p className="text-sm font-medium text-neutral-800">
                                                #{i + 1} -{' '}
                                                {BODY_REGION_OPTIONS.find(o => o.value === s.body_region)
                                                    ?.label ?? s.body_region}
                                            </p>
                                            {s.tests?.length > 0 && (
                                                <ul className="mt-1 text-xs text-neutral-600 space-y-0.5">
                                                    {s.tests.map((t, j) => (
                                                        <li key={j}>
                                                            <span className="font-medium">{t.test_code}</span> - {t.name}{' '}
                                                            (x{t.quantity})
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </BaseCard>
                    )}

                    {caseData.date_info && caseData.date_info.length > 0 && (
                        <BaseCard variant="muted" padding="md" className="bg-white">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-2">
                                    <History className="w-5 h-5 text-lime-brand-600" />
                                    <h4 className="text-sm font-semibold text-neutral-700">Cronología del Caso</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {caseData.date_info[0].created_at && (
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-medium text-neutral-500">Fecha de creación</p>
                                            <p className="text-sm text-neutral-900">{formatDateTime(caseData.date_info[0].created_at)}</p>
                                        </div>
                                    )}
                                    {caseData.date_info[0].update_at && (
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-medium text-neutral-500">Última edición</p>
                                            <p className="text-sm text-neutral-900">{formatDateTime(caseData.date_info[0].update_at)}</p>
                                        </div>
                                    )}
                                    {caseData.date_info[0].transcribed_at && (
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-medium text-neutral-500">Fecha de transcripción</p>
                                            <p className="text-sm text-neutral-900">
                                                {formatDateTime(caseData.date_info[0].transcribed_at)}
                                            </p>
                                        </div>
                                    )}
                                    {caseData.date_info[0].signed_at && (
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-medium text-neutral-500">Fecha de firma</p>
                                            <p className="text-sm text-neutral-900">{formatDateTime(caseData.date_info[0].signed_at)}</p>
                                        </div>
                                    )}
                                    {caseData.date_info[0].delivered_at && (
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-medium text-neutral-500">Fecha de entrega</p>
                                            <p className="text-sm text-neutral-900">
                                                {formatDateTime(caseData.date_info[0].delivered_at)}
                                            </p>
                                        </div>
                                    )}
                                    {caseData.delivered_to && (
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-medium text-neutral-500">Entregado a</p>
                                            <p className="text-sm text-neutral-900 break-all">
                                                {caseData.delivered_to}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </BaseCard>
                    )}
                </div>

                {/* ── RESULTADOS DEL CASO ── */}
                {caseData.result && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-6 space-y-6">
                        <div className="flex items-center gap-2 mb-1">
                            <Microscope className="w-5 h-5 text-emerald-600" />
                            <h3 className="text-base font-semibold text-emerald-800">Resultados del caso</h3>
                        </div>

                        {/* Método */}
                        {caseData.result.method && caseData.result.method.some(m => m?.trim()) && (
                            <BaseCard variant="muted" padding="md" className="bg-white">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 pb-2">
                                        <FlaskConical className="w-4 h-4 text-emerald-600" />
                                        <h4 className="text-sm font-semibold text-neutral-700">Método</h4>
                                    </div>
                                    <ul className="flex flex-wrap gap-2">
                                        {caseData.result.method.filter(m => m?.trim()).map((m, i) => (
                                            <li key={i} className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                                                {m}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </BaseCard>
                        )}

                        {/* Corte Macroscópico y Descripción Microscópica — verticales, mismo ícono */}
                        {(caseData.result.macro_result || caseData.result.micro_result) && (
                            <div className="space-y-4">
                                {caseData.result.macro_result && (
                                    <BaseCard variant="muted" padding="md" className="bg-white">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 pb-2">
                                                <FileText className="w-4 h-4 text-emerald-600" />
                                                <h4 className="text-sm font-semibold text-neutral-700">Corte Macroscópico</h4>
                                            </div>
                                            <div
                                                className="text-sm text-neutral-800 prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(caseData.result.macro_result) }}
                                            />
                                        </div>
                                    </BaseCard>
                                )}
                                {caseData.result.micro_result && (
                                    <BaseCard variant="muted" padding="md" className="bg-white">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 pb-2">
                                                <FileText className="w-4 h-4 text-emerald-600" />
                                                <h4 className="text-sm font-semibold text-neutral-700">Descripción Microscópica</h4>
                                            </div>
                                            <div
                                                className="text-sm text-neutral-800 prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(caseData.result.micro_result) }}
                                            />
                                        </div>
                                    </BaseCard>
                                )}
                            </div>
                        )}

                        {/* Diagnóstico — ícono Microscope */}
                        {caseData.result.diagnosis && (
                            <BaseCard variant="muted" padding="md" className="bg-white">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 pb-2">
                                        <Microscope className="w-4 h-4 text-emerald-600" />
                                        <h4 className="text-sm font-semibold text-neutral-700">Diagnóstico</h4>
                                    </div>
                                    <div
                                        className="text-sm text-neutral-800 prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(caseData.result.diagnosis) }}
                                    />
                                </div>
                            </BaseCard>
                        )}

                        {/* CIE-10 y CIE-O */}
                        {(caseData.result.cie10_diagnosis || caseData.result.cieo_diagnosis) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {caseData.result.cie10_diagnosis && (
                                    <BaseCard variant="muted" padding="md" className="bg-white">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Diagnóstico CIE-10</p>
                                            <p className="text-sm text-neutral-900">
                                                <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 mr-2">
                                                    {caseData.result.cie10_diagnosis.code}
                                                </span>
                                                {caseData.result.cie10_diagnosis.name}
                                            </p>
                                        </div>
                                    </BaseCard>
                                )}
                                {caseData.result.cieo_diagnosis && (
                                    <BaseCard variant="muted" padding="md" className="bg-white">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Diagnóstico CIE-O (Oncológico)</p>
                                            <p className="text-sm text-neutral-900">
                                                <span className="inline-flex items-center rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 mr-2">
                                                    {caseData.result.cieo_diagnosis.code}
                                                </span>
                                                {caseData.result.cieo_diagnosis.name}
                                            </p>
                                        </div>
                                    </BaseCard>
                                )}
                            </div>
                        )}

                        {/* Imágenes del diagnóstico — con lightbox */}
                        {diagImages.length > 0 && (
                            <BaseCard variant="muted" padding="md" className="bg-white">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 pb-2">
                                        <Image className="w-4 h-4 text-emerald-600" />
                                        <h4 className="text-sm font-semibold text-neutral-700">
                                            Imágenes del diagnóstico ({diagImages.length})
                                        </h4>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {diagImages.map((src, i) => (
                                            <div key={i} className="relative group aspect-square cursor-pointer" onClick={() => setLightboxIndex(i)}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={src}
                                                    alt={`Imagen ${i + 1}`}
                                                    className="w-full h-full object-cover rounded-xl border border-neutral-200 transition-transform group-hover:scale-[1.02]"
                                                />
                                                <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <ZoomIn className="w-7 h-7 text-white drop-shadow" />
                                                </div>
                                                <span className="absolute bottom-1 left-1 text-[10px] font-semibold bg-black/50 text-white px-1.5 py-0.5 rounded-md leading-none">
                                                    {i + 1}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </BaseCard>
                        )}

                        {/* Lightbox de imágenes */}
                        {lightboxIndex !== null && (
                            <div
                                className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center"
                                onClick={() => setLightboxIndex(null)}
                            >
                                <button
                                    type="button"
                                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                                    onClick={() => setLightboxIndex(null)}
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                                <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
                                    {lightboxIndex + 1} / {diagImages.length}
                                </span>
                                {diagImages.length > 1 && (
                                    <button
                                        type="button"
                                        className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                                        onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                )}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={diagImages[lightboxIndex]}
                                    alt={`Imagen ${lightboxIndex + 1}`}
                                    className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                {diagImages.length > 1 && (
                                    <button
                                        type="button"
                                        className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                                        onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Sin resultados cargados aún */}
                        {!caseData.result.macro_result &&
                            !caseData.result.micro_result &&
                            !caseData.result.diagnosis &&
                            !caseData.result.cie10_diagnosis &&
                            !caseData.result.cieo_diagnosis &&
                            (!caseData.result.method || !caseData.result.method.some(m => m?.trim())) &&
                            (!caseData.result.diagnosis_images || caseData.result.diagnosis_images.length === 0) && (
                                <p className="text-sm text-neutral-500 italic">Aún no hay resultados registrados para este caso.</p>
                            )}
                    </div>
                )}

                {patient && (
                    <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <PatientSection icon={FileText} sectionTitle="Identificación">
                                    <InfoItem label="Código del Paciente" value={patient.patient_code} />
                                    <InfoItem label="Número de Identificación" value={patient.identification_number} />
                                </PatientSection>
                                <PatientSection icon={User} sectionTitle="Información Personal">
                                    <InfoItem label="Nombre Completo" value={patient.full_name} />
                                    <InfoItem label="Sexo" value={patient.gender} />
                                    <InfoItem label="Fecha de Nacimiento" value={formatDate(patient.birth_date)} />
                                    <InfoItem label="Edad" value={formatAge(patient.age, patient.birth_date)} />
                                </PatientSection>
                                <PatientSection icon={Phone} sectionTitle="Contacto">
                                    <InfoItem label="Teléfono" value={patient.phone} />
                                    <InfoItem label="Correo Electrónico" value={patient.email} />
                                </PatientSection>
                            </div>
                            <div className="space-y-6">
                                <PatientSection icon={MapPin} sectionTitle="Ubicación">
                                    <InfoItem label="País" value={patient.location?.country} />
                                    <InfoItem label="Departamento" value={patient.location?.department} />
                                    <InfoItem label="Municipio" value={patient.location?.municipality} />
                                    <InfoItem label="Dirección" value={patient.location?.address} />
                                </PatientSection>
                                <PatientSection icon={Building2} sectionTitle="Atención">
                                    <InfoItem label="Entidad" value={patient.entity_info?.entity_name} />
                                    <InfoItem label="EPS" value={patient.entity_info?.eps_name} />
                                    <InfoItem label="Tipo de Atención" value={patient.care_type} />
                                </PatientSection>
                                {patient.observations && (
                                    <BaseCard variant="muted" padding="md" className="bg-white">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 pb-2">
                                                <FileText className="w-5 h-5 text-lime-brand-600" />
                                                <h4 className="text-sm font-semibold text-neutral-700">
                                                    Observaciones
                                                </h4>
                                            </div>
                                            <div>
                                                <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                                                    {patient.observations}
                                                </p>
                                            </div>
                                        </div>
                                    </BaseCard>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {patient && (
                    <div className="w-full">
                        <BaseCard variant="muted" padding="md" className="bg-white">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-2">
                                    <History className="w-5 h-5 text-lime-brand-600" />
                                    <h4 className="text-sm font-semibold text-neutral-700">Casos anteriores del paciente</h4>
                                </div>
                                {previousCases.length === 0 ? (
                                    <p className="text-sm text-neutral-500">No hay casos anteriores</p>
                                ) : (
                                    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-neutral-50 border-b border-neutral-200">
                                                    <th className="text-left py-3 px-4 font-medium text-neutral-600">Código</th>
                                                    <th className="text-left py-3 px-4 font-medium text-neutral-600">Fecha</th>
                                                    <th className="text-left py-3 px-4 font-medium text-neutral-600">Patólogo</th>
                                                    <th className="text-left py-3 px-4 font-medium text-neutral-600">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previousCases.map(c => (
                                                    <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/80">
                                                        <td className="py-3 px-4 font-medium text-neutral-900">{c.case_code}</td>
                                                        <td className="py-3 px-4 text-neutral-700">{formatDateTime(getDateFromDateInfo(c.date_info, 'created_at')) ?? '-'}</td>
                                                        <td className="py-3 px-4 text-neutral-700">{c.assigned_pathologist?.name ?? '-'}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(c.status)}`}>
                                                                {c.status ?? '-'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </BaseCard>
                    </div>
                )}

                {isAdmin && caseData.audit_info && caseData.audit_info.length > 0 && (
                    <div className="w-full">
                        <BaseCard variant="muted" padding="md" className="bg-white">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-2">
                                    <ShieldCheck className="w-5 h-5 text-lime-brand-600" />
                                    <h4 className="text-sm font-semibold text-neutral-700">Auditoría del caso</h4>
                                </div>
                                <div className="space-y-2">
                                    {caseData.audit_info.map((entry, idx) => (
                                        <div key={idx} className="flex items-start gap-3 text-sm">
                                            <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${entry.action === 'created' ? 'bg-blue-100 text-blue-700' :
                                                entry.action === 'signed' ? 'bg-green-100 text-green-700' :
                                                    entry.action === 'delivered' ? 'bg-purple-100 text-purple-700' :
                                                        entry.action === 'transcribed' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-neutral-100 text-neutral-600'
                                                }`}>
                                                {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                                            </span>
                                            <span className="text-neutral-700">
                                                <span className="font-medium">{entry.user_name || entry.user_email}</span>
                                                <span className="text-neutral-400 ml-1">·</span>
                                                <span className="text-neutral-500 ml-1">{formatDateTime(entry.timestamp)}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </BaseCard>
                    </div>
                )}

                {/* ── NOTAS ADICIONALES ── */}
                {isAdmin && caseData.status === 'Completado' && (
                    <div className="w-full space-y-4">
                        {caseData.additional_notes && caseData.additional_notes.length > 0 && (
                            <BaseCard variant="muted" padding="md" className="bg-white">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 pb-2">
                                        <NotebookPen className="w-5 h-5 text-amber-500" />
                                        <h4 className="text-sm font-semibold text-neutral-700">Notas adicionales</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {caseData.additional_notes.map((note, idx) => (
                                            <div key={idx} className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
                                                <div className="flex-1 min-w-0">
                                                    {note.date && (
                                                        <p className="text-xs text-neutral-400 mb-0.5">{formatDateTime(note.date)}</p>
                                                    )}
                                                    <p className="text-sm text-neutral-800 whitespace-pre-wrap">{note.text}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    title="Eliminar nota"
                                                    onClick={async () => {
                                                        if (!caseData.id) return;
                                                        const updated = await caseService.deleteNote(caseData.id, idx);
                                                        onCaseUpdated?.(updated);
                                                    }}
                                                    className="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                >
                                                    <XIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </BaseCard>
                        )}
                    </div>
                )}
            </div>
        </SuccessModal>

        <AddNoteModal
            isOpen={showNoteModal}
            caseId={caseData.id}
            onClose={() => setShowNoteModal(false)}
            onSaved={(updated) => { onCaseUpdated?.(updated); setShowNoteModal(false); }}
        />
        </>
    );
}
