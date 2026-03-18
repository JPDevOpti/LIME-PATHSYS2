'use client';

import { BaseCard } from '@/shared/components/base/BaseCard';
import { Case } from '@/features/cases/types/case.types';
import { FileText, ClipboardList, User, FlaskConical } from 'lucide-react';

interface CaseInfoCardProps {
    caseData: Case | null;
    badgeLabel?: string;
    emptyStateMessage?: string;
    emptyStateSubtext?: string;
}

const InfoItem = ({ label, value }: { label: string; value?: string | number }) => {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    return (
        <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-neutral-500">{label}</p>
            <p className="text-sm text-neutral-900 break-all">{value}</p>
        </div>
    );
};

const Section = ({
    icon: Icon,
    title,
    children,
}: {
    icon: React.ElementType;
    title: string;
    children: React.ReactNode;
}) => (
    <div className="bg-neutral-100 rounded-lg p-4 border border-neutral-200">
        <div className="flex items-center gap-2 pb-2">
            <Icon className="w-5 h-5 text-lime-brand-600" />
            <h4 className="text-sm font-semibold text-neutral-700">{title}</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {children}
        </div>
    </div>
);

const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export function CaseInfoCard({
    caseData,
    badgeLabel = 'Cargado',
    emptyStateMessage = 'No hay información del caso',
    emptyStateSubtext = 'Busque un caso para transcribir resultados',
}: CaseInfoCardProps) {
    if (!caseData) {
        return (
            <BaseCard variant="default" padding="lg" className="bg-white border border-neutral-200">
                <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                    <ClipboardList className="w-16 h-16 mb-3 opacity-40" />
                    <p className="text-sm font-medium text-neutral-500">{emptyStateMessage}</p>
                    <p className="text-xs text-neutral-400 mt-1">{emptyStateSubtext}</p>
                </div>
            </BaseCard>
        );
    }

    return (
        <BaseCard variant="default" padding="lg" className="bg-white border border-neutral-200">
            <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                    <h3 className="text-lg font-bold text-neutral-900">Información del Caso</h3>
                    <span className="inline-flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <span className="text-xs font-medium text-green-700">{badgeLabel}</span>
                    </span>
                </div>

                <Section icon={FileText} title="Identificación">
                    <InfoItem label="Código del Caso" value={caseData.case_code} />
                    <InfoItem label="Estado" value={caseData.status} />
                    <InfoItem label="Servicio" value={caseData.service} />
                </Section>

                <Section icon={User} title="Solicitud">
                    <InfoItem label="Médico Solicitante" value={caseData.doctor} />
                    <InfoItem label="Entidad" value={caseData.entity?.name} />
                </Section>

                <Section icon={User} title="Patólogos">
                    <div className="col-span-2 space-y-3">
                        <div>
                            <p className="text-xs font-medium text-neutral-500 mb-1">Patólogo Titular</p>
                            <p className="text-sm text-neutral-900 font-medium">
                                {caseData.assigned_pathologist?.name || 'Sin asignar'}
                            </p>
                        </div>
                        {caseData.assistant_pathologists && caseData.assistant_pathologists.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-neutral-500 mb-1">Patólogos Asistentes</p>
                                <div className="flex flex-wrap gap-2">
                                    {caseData.assistant_pathologists.map((a, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                                        >
                                            {a.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Section>

                <Section icon={FlaskConical} title="Muestras y Pruebas">
                    {caseData.samples?.length ? (
                        caseData.samples.map((sample, idx) => (
                            <div key={idx} className="col-span-2 sm:col-span-2">
                                <p className="text-xs font-medium text-neutral-500 mb-1">
                                    Región: {sample.body_region}
                                </p>
                                <ul className="list-disc list-inside text-sm text-neutral-700 space-y-0.5">
                                    {sample.tests?.map((t, j) => (
                                        <li key={j}>
                                            <span className="font-medium">{t.test_code}</span> - {t.name}
                                            {t.quantity > 1 && ` (x${t.quantity})`}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-neutral-500 col-span-2">Sin muestras registradas</p>
                    )}
                </Section>

                {caseData.date_info && caseData.date_info.length > 0 && (
                    <Section icon={ClipboardList} title="Cronología del Caso">
                        <InfoItem label="Fecha de creación" value={formatDateTime(caseData.date_info[0].created_at)} />
                        <InfoItem label="Última edición" value={formatDateTime(caseData.date_info[0].update_at)} />
                        <InfoItem label="Fecha de transcripción" value={formatDateTime(caseData.date_info[0].transcribed_at)} />
                        <InfoItem label="Fecha de firma" value={formatDateTime(caseData.date_info[0].signed_at)} />
                        <InfoItem label="Fecha de entrega" value={formatDateTime(caseData.date_info[0].delivered_at)} />
                    </Section>
                )}

                {caseData.observations && (
                    <div className="bg-neutral-100 rounded-lg p-4 border border-neutral-200">
                        <div className="flex items-center gap-2 pb-2">
                            <FileText className="w-5 h-5 text-lime-brand-600" />
                            <h4 className="text-sm font-semibold text-neutral-700">Observaciones</h4>
                        </div>
                        <p className="text-sm text-neutral-700 whitespace-pre-wrap">{caseData.observations}</p>
                    </div>
                )}
            </div>
        </BaseCard >
    );
}
