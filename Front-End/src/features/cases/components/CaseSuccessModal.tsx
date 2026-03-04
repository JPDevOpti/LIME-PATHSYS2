'use client';

import Link from 'next/link';
import { Case } from '../types/case.types';
import { BODY_REGION_OPTIONS, TEST_OPTIONS } from '../data/case-options';
import { SuccessModal } from '@/shared/components/overlay/SuccessModal';
import { CloseButton } from '@/shared/components/ui/buttons';
import { BaseCard } from '@/shared/components/base/BaseCard';
import { FileText, User, Phone, MapPin, Building2, FlaskConical, List, History } from 'lucide-react';
import { formatAge } from '@/shared/utils/formatAge';

interface CaseSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseData: Case;
    variant?: 'create' | 'edit';
}

export function CaseSuccessModal({ isOpen, onClose, caseData, variant = 'create' }: CaseSuccessModalProps) {
    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return 'No especificado';
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
        const normalized = !dateStr.includes('T') ? `${dateStr}T00:00:00` : dateStr;
        return new Date(normalized).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const InfoItem = ({ label, value }: { label: string; value?: string | number | boolean }) => {
        if (value === undefined || value === null || String(value).trim() === '') return null;
        return (
            <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-neutral-500">{label}</p>
                <p className="text-sm text-neutral-900 break-all">{value === true ? 'Sí' : value === false ? 'No' : value}</p>
            </div>
        );
    };

    const PatientSection = ({ icon: Icon, sectionTitle, children }: { icon: React.ElementType; sectionTitle: string; children: React.ReactNode }) => (
        <BaseCard variant="muted" padding="md">
            <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
                    <Icon className="w-4 h-4 text-lime-brand-600" />
                    <h4 className="text-sm font-semibold text-neutral-700">{sectionTitle}</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {children}
                </div>
            </div>
        </BaseCard>
    );

    const priorityLabels: Record<string, string> = {
        normal: 'Normal',
        prioritario: 'Prioritario'
    };

    const description =
        variant === 'edit' ? 'El caso ha sido actualizado en el sistema' : '';
    const patient = caseData.patient;

    const isEdit = variant === 'edit';
    const modalTitle = (
        <div className="space-y-1">
            <p className={`text-3xl font-bold tracking-tight ${isEdit ? 'text-blue-600' : 'text-green-600'}`}>
                {caseData.case_code}
            </p>
            <p className="text-lg font-medium text-neutral-700">
                {isEdit ? 'Caso actualizado exitosamente' : 'Caso creado exitosamente'}
            </p>
        </div>
    );

    return (
        <SuccessModal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            description={description}
            variant={variant}
            size="7xl"
            footer={
                <>
                    <CloseButton onClick={onClose} />
                    <Link
                        href="/cases"
                        onClick={onClose}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-lime-brand-600 hover:bg-lime-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-brand-500 transition-colors h-11"
                    >
                        <List className="h-4 w-4" />
                        Ver listado de casos
                    </Link>
                </>
            }
        >
            <div className="space-y-6">
                {/* Sección 1: Información del caso */}
                <BaseCard variant="muted" padding="md">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
                            <FileText className="w-4 h-4 text-lime-brand-600" />
                            <h4 className="text-sm font-semibold text-neutral-700">Información del Caso</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs font-medium text-neutral-500">Código del Caso</p>
                                <p className="text-sm font-semibold text-neutral-900">{caseData.case_code}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-neutral-500">Prioridad</p>
                                <p className="text-sm text-neutral-900">{priorityLabels[caseData.priority] || caseData.priority}</p>
                            </div>
                            <InfoItem label="Usuario que ingresó" value={caseData.created_by} />
                            <InfoItem label="Servicio" value={caseData.service} />
                            <InfoItem label="Entidad" value={caseData.entity} />
                            <div>
                                <p className="text-xs font-medium text-neutral-500">Médico remitente</p>
                                <p className="text-sm text-neutral-900">{caseData.doctor}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-200">
                            <div>
                                <p className="text-xs font-medium text-neutral-500">Observaciones</p>
                                <p className="text-sm text-neutral-900 whitespace-pre-wrap">{caseData.observations || 'Sin datos'}</p>
                            </div>
                        </div>
                    </div>
                </BaseCard>

                {caseData.samples && caseData.samples.length > 0 && (
                    <BaseCard variant="muted" padding="md">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
                                <FlaskConical className="w-4 h-4 text-lime-brand-600" />
                                <h4 className="text-sm font-semibold text-neutral-700">Muestras</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {caseData.samples.map((s, i) => (
                                    <div key={i} className="py-2">
                                        <p className="text-sm font-medium text-neutral-800">
                                            #{i + 1} - {BODY_REGION_OPTIONS.find(o => o.value === s.body_region)?.label || s.body_region}
                                        </p>
                                        {s.tests?.length > 0 && (
                                            <ul className="mt-1 text-xs text-neutral-600 space-y-0.5">
                                                {s.tests.map((t, j) => (
                                                    <li key={j}>
                                                        {TEST_OPTIONS.find(o => o.value === t.code)?.label || t.name || t.code} (x{t.quantity})
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
                    <BaseCard variant="muted" padding="md">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
                                <History className="w-4 h-4 text-lime-brand-600" />
                                <h4 className="text-sm font-semibold text-neutral-700">Cronología del Caso</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                <InfoItem label="Fecha de creación" value={formatDateTime(caseData.date_info[0].created_at)} />
                                <InfoItem label="Última edición" value={formatDateTime(caseData.date_info[0].update_at)} />
                                <InfoItem label="Fecha de transcripción" value={formatDateTime(caseData.date_info[0].transcribed_at)} />
                                <InfoItem label="Fecha de firma" value={formatDateTime(caseData.date_info[0].signed_at)} />
                                <InfoItem label="Fecha de entrega" value={formatDateTime(caseData.date_info[0].delivered_at)} />
                            </div>
                        </div>
                    </BaseCard>
                )}

                {/* Sección 2: Datos del paciente */}
                <div>
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
                            <BaseCard variant="muted" padding="md">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
                                        <FileText className="w-4 h-4 text-lime-brand-600" />
                                        <h4 className="text-sm font-semibold text-neutral-700">Observaciones</h4>
                                    </div>
                                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                                        {patient.observations || 'Sin observaciones'}
                                    </p>
                                </div>
                            </BaseCard>
                        </div>
                    </div>
                </div>
            </div>
        </SuccessModal>
    );
}
