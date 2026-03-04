'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Patient } from '../types/patient.types';
import { patientService } from '../services/patient.service';
import { caseService } from '@/features/cases/services/case.service';
import { Case, getDateFromDateInfo } from '@/features/cases/types/case.types';
import { SuccessModal } from '@/shared/components/overlay/SuccessModal';
import { CloseButton } from '@/shared/components/ui/buttons';
import { BaseCard } from '@/shared/components/base/BaseCard';
import { User, Phone, MapPin, Building2, FileText, UserRoundPen, ClipboardPlus, History } from 'lucide-react';
import { formatAge } from '@/shared/utils/formatAge';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { CaseDetailsModal } from '@/features/cases/components/CaseDetailsModal';

interface PatientDetailsModalProps {
    visible: boolean;
    patient: Patient | null;
    onClose: () => void;
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return undefined;
    const normalized = !dateStr.includes('T') ? `${dateStr}T00:00:00` : dateStr;
    const date = new Date(normalized);
    return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return undefined;
    return new Date(dateStr).toLocaleString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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

function getAuditInfoText(patient: Patient): string | null {
    const audit = patient.audit_info;
    if (!audit || audit.length === 0) return null;
    const created = audit.find((e) => e.action === 'created');
    const lastUpdated = audit.filter((e) => e.action === 'updated').pop() ?? created;
    const parts: string[] = [];
    if (created) parts.push(`Creado por ${created.user_email} el ${formatDate(created.timestamp) ?? ''}`);
    if (lastUpdated && lastUpdated !== created)
        parts.push(`Última actualización por ${lastUpdated.user_email} el ${formatDate(lastUpdated.timestamp) ?? ''}`);
    return parts.length > 0 ? parts.join(' | ') : null;
}

export function PatientDetailsModal({ visible, patient, onClose }: PatientDetailsModalProps) {
    const { isPatologo } = usePermissions();
    const [fullPatient, setFullPatient] = useState<Patient | null>(null);
    const [previousCases, setPreviousCases] = useState<Case[]>([]);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);

    useEffect(() => {
        if (!patient) {
            setFullPatient(null);
            return;
        }
        setFullPatient(patient);
        if (patient.id) {
            patientService.getPatientById(patient.id).then((p) => {
                if (p) setFullPatient(p);
            });
        }
    }, [patient]);

    useEffect(() => {
        if (!visible || !patient?.id) {
            setPreviousCases([]);
            return;
        }
        caseService.getCasesByPatientId(patient.id).then(setPreviousCases).catch(() => setPreviousCases([]));
    }, [visible, patient?.id]);

    const displayPatient = patient ? (fullPatient ?? patient) : null;
    if (!displayPatient) return null;

    const InfoItem = ({ label, value }: { label: string; value?: string }) => {
        if (!value) return null;
        return (
            <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-neutral-500">{label}</p>
                <p className="text-sm text-neutral-900 break-all">{value}</p>
            </div>
        );
    };

    const Section = ({
        icon: Icon,
        sectionTitle,
        children
    }: {
        icon: React.ElementType;
        sectionTitle: string;
        children: React.ReactNode;
    }) => (
        <BaseCard variant="muted" padding="md">
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

    const modalTitle = (
        <div className="space-y-1">
            <p className="text-2xl font-bold text-neutral-900">Detalles del Paciente</p>
            <p className="text-sm text-neutral-600">{displayPatient.full_name}</p>
        </div>
    );

    return (
        <SuccessModal
            isOpen={visible}
            onClose={onClose}
            title={modalTitle}
            description={displayPatient.patient_code ?? ''}
            variant="edit"
            size="5xl"
            footer={
                <div className="w-full flex justify-between items-center gap-4 flex-wrap">
                    <div className="text-sm text-neutral-500 text-left min-w-0 flex-1">
                        {getAuditInfoText(displayPatient) || null}
                    </div>
                    <div className="flex gap-3 shrink-0">
                        {!isPatologo && (
                            <Link
                                href={displayPatient.id ? `/patients/edit?id=${encodeURIComponent(displayPatient.id)}` : '#'}
                                onClick={onClose}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                                <UserRoundPen className="w-4 h-4" />
                                Editar
                            </Link>
                        )}
                        {!isPatologo && (
                            <Link
                                href={displayPatient.id ? `/cases/create?patientId=${displayPatient.id}` : '/cases/create'}
                                onClick={onClose}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-lime-brand-600 hover:bg-lime-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-brand-500 transition-colors"
                            >
                                <ClipboardPlus className="w-4 h-4" />
                                Crear caso
                            </Link>
                        )}
                        <CloseButton onClick={onClose} />
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <Section icon={FileText} sectionTitle="Identificación">
                            <InfoItem label="Código del Paciente" value={displayPatient.patient_code} />
                            <InfoItem label="Tipo de Documento" value={displayPatient.identification_type} />
                            <InfoItem label="Número de Identificación" value={displayPatient.identification_number} />
                        </Section>
                        <Section icon={User} sectionTitle="Información Personal">
                            <InfoItem label="Nombre Completo" value={displayPatient.full_name} />
                            <InfoItem label="Sexo" value={displayPatient.gender} />
                            <InfoItem label="Fecha de Nacimiento" value={formatDate(displayPatient.birth_date)} />
                            <InfoItem label="Edad" value={formatAge(displayPatient.age, displayPatient.birth_date)} />
                        </Section>
                        <Section icon={Phone} sectionTitle="Contacto">
                            <InfoItem label="Teléfono" value={displayPatient.phone} />
                            <InfoItem label="Correo Electrónico" value={displayPatient.email} />
                        </Section>
                    </div>
                    <div className="space-y-6">
                        <Section icon={MapPin} sectionTitle="Ubicación">
                            
                            <InfoItem label="Departamento" value={displayPatient.location?.department} />
                            <InfoItem label="Municipio" value={displayPatient.location?.municipality} />
                            <InfoItem label="Dirección" value={displayPatient.location?.address} />
                        </Section>
                        <Section icon={Building2} sectionTitle="Atención">
                            <InfoItem label="Entidad" value={displayPatient.entity_info?.entity_name} />
                            <InfoItem label="EPS" value={displayPatient.entity_info?.eps_name} />
                            <InfoItem label="Tipo de Atención" value={displayPatient.care_type} />
                        </Section>
                        {displayPatient.observations && (
                            <Section icon={FileText} sectionTitle="Observaciones">
                                <div className="sm:col-span-2">
                                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                                        {displayPatient.observations}
                                    </p>
                                </div>
                            </Section>
                        )}
                    </div>
                </div>

                <div className="w-full">
                    <BaseCard variant="muted" padding="md">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-2">
                                <History className="w-5 h-5 text-lime-brand-600" />
                                <h4 className="text-sm font-semibold text-neutral-700">Casos del paciente</h4>
                            </div>
                            {previousCases.length === 0 ? (
                                <p className="text-sm text-neutral-500">No hay casos registrados</p>
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
                                                <tr
                                                    key={c.id}
                                                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/80 cursor-pointer transition-colors"
                                                    onClick={() => setSelectedCase(c)}
                                                    title="Ver detalles del caso"
                                                >
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
            </div>

            <CaseDetailsModal
                visible={selectedCase !== null}
                caseData={selectedCase}
                onClose={() => setSelectedCase(null)}
            />
        </SuccessModal>
    );
}
