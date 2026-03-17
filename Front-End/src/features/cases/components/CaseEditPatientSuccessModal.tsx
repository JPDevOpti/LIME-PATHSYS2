'use client';

import { Patient } from '@/features/patients/types/patient.types';
import { SuccessModal } from '@/shared/components/overlay/SuccessModal';
import { CloseButton } from '@/shared/components/ui/buttons';
import Link from 'next/link';
import { BaseCard } from '@/shared/components/base/BaseCard';
import { User, Phone, MapPin, Building2, FileText } from 'lucide-react';
import { formatAge } from '@/shared/utils/formatAge';

interface CaseEditPatientSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: Patient;
    hideCrearCasoLink?: boolean;
}

const formatAuditDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No especificado';
    const normalizedDateStr = !dateStr.includes('T') ? `${dateStr}T00:00:00` : dateStr;
    return new Date(normalizedDateStr).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const InfoItem = ({ label, value }: { label: string; value?: string }) => {
    if (!value) return null;
    return (
        <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-neutral-500">{label}</p>
            <p className="text-sm text-neutral-900 break-all">{value}</p>
        </div>
    );
};

const Section = ({ icon: Icon, sectionTitle, children }: { icon: React.ElementType; sectionTitle: string; children: React.ReactNode }) => (
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

function getAuditInfoText(patient: Patient): string | null {
    const audit = patient.audit_info;
    if (!audit || audit.length === 0) return null;
    const created = audit.find((e) => e.action === 'created');
    const lastUpdated = audit.filter((e) => e.action === 'updated').pop() ?? created;
    const parts: string[] = [];
    if (created) parts.push(`Creado por ${created.user_email} el ${formatAuditDate(created.timestamp)}`);
    if (lastUpdated && lastUpdated !== created)
        parts.push(`Última actualización por ${lastUpdated.user_email} el ${formatAuditDate(lastUpdated.timestamp)}`);
    return parts.length > 0 ? parts.join(' | ') : null;
}

export function CaseEditPatientSuccessModal({ isOpen, onClose, patient, hideCrearCasoLink = false }: CaseEditPatientSuccessModalProps) {
    return (
        <SuccessModal
            isOpen={isOpen}
            onClose={onClose}
            title="Paciente Actualizado Exitosamente"
            description="La información del paciente ha sido actualizada"
            variant="edit"
            footer={
                <div className="w-full grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center">
                    <p className="text-sm text-neutral-500 text-left min-w-0 break-words">
                        {getAuditInfoText(patient) || null}
                    </p>
                    <div className="flex justify-end gap-3">
                        {!hideCrearCasoLink && (
                            <Link
                                href={patient.id ? `/cases/create?patientId=${patient.id}` : '/cases/create'}
                                onClick={onClose}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                            >
                                Crear Caso
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
                            <InfoItem label="Código del Paciente" value={patient.patient_code} />
                            <InfoItem label="Número de Identificación" value={patient.identification_number} />
                        </Section>
                        <Section icon={User} sectionTitle="Información Personal">
                            <InfoItem label="Nombre Completo" value={patient.full_name} />
                            <InfoItem label="Sexo" value={patient.gender} />
                            <InfoItem label="Fecha de Nacimiento" value={formatDate(patient.birth_date)} />
                            <InfoItem label="Edad" value={formatAge(patient.age, patient.birth_date)} />
                        </Section>
                        <Section icon={Phone} sectionTitle="Contacto">
                            <InfoItem label="Teléfono" value={patient.phone} />
                            <InfoItem label="Correo Electrónico" value={patient.email} />
                        </Section>
                    </div>
                    <div className="space-y-6">
                        <Section icon={MapPin} sectionTitle="Ubicación">
                            <InfoItem label="País" value={patient.location?.country} />
                            <InfoItem label="Departamento" value={patient.location?.department} />
                            <InfoItem label="Municipio" value={patient.location?.municipality} />
                            <InfoItem label="Dirección" value={patient.location?.address} />
                        </Section>
                        <Section icon={Building2} sectionTitle="Atención">
                            <InfoItem label="Entidad" value={patient.entity_info?.entity_name} />
                            <InfoItem label="EPS" value={patient.entity_info?.eps_name} />
                            <InfoItem label="Tipo de Atención" value={patient.care_type} />
                        </Section>
                        {patient.observations && (
                            <Section icon={FileText} sectionTitle="Observaciones">
                                <div className="sm:col-span-2">
                                    <p className="text-sm text-neutral-700 whitespace-pre-wrap">{patient.observations}</p>
                                </div>
                            </Section>
                        )}
                    </div>
                </div>
            </div>
        </SuccessModal>
    );
}
