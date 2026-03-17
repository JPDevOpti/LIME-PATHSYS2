'use client';

import { useEffect, useState } from 'react';
import { Patient } from '@/features/patients/types/patient.types';
import { Case, getDateFromDateInfo } from '@/features/cases/types/case.types';
import { caseService } from '@/features/cases/services/case.service';
import { EditPatientModal } from './EditPatientModal';
import { CaseDetailsModal } from './CaseDetailsModal';
import { BaseCard } from '@/shared/components/base/BaseCard';
import { User, FileText, Phone, MapPin, Building2, ClipboardList, UserRoundPen } from 'lucide-react';
import { formatAge } from '@/shared/utils/formatAge';

interface PatientInfoCardProps {
    patient: Patient | null;
    badgeLabel?: string;
    emptyStateMessage?: string;
    emptyStateSubtext?: string;
    lastCaseCreatedAt?: string | null;
    editable?: boolean;
    onPatientUpdated?: (patient: Patient) => void;
    hideCrearCasoLink?: boolean;
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const normalized = !dateStr.includes('T') ? `${dateStr}T00:00:00` : dateStr;
    return new Date(normalized).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getAuditInfoText = (p: Patient): string | null => {
    const audit = p.audit_info;
    if (!audit || audit.length === 0) return null;
    const created = audit.find((e) => e.action === 'created');
    const lastUpdated = audit.filter((e) => e.action === 'updated').pop() ?? created;
    const parts: string[] = [];
    if (created) parts.push(`Creado por ${created.user_email} el ${formatDate(created.timestamp)}`);
    if (lastUpdated && lastUpdated !== created)
        parts.push(`Última actualización por ${lastUpdated.user_email} el ${formatDate(lastUpdated.timestamp)}`);
    return parts.length > 0 ? parts.join(' | ') : null;
};

const InfoItem = ({ label, value }: { label: string; value?: string | number }) => {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    return (
        <div className="flex flex-col gap-0.5">
            <p className="text-xs font-medium text-neutral-500">{label}</p>
            <p className="text-sm text-neutral-900 break-all">{value}</p>
        </div>
    );
};

function getStatusClass(status?: string): string {
    if (status === 'Completado') return 'bg-green-50 text-green-700';
    if (status === 'Por entregar') return 'bg-red-50 text-red-700 font-semibold';
    if (status === 'Por firmar') return 'bg-yellow-50 text-yellow-700';
    if (status === 'Descrip micro') return 'bg-indigo-50 text-indigo-700';
    if (status === 'Corte macro') return 'bg-cyan-50 text-cyan-700';
    if (status === 'En recepción') return 'bg-blue-50 text-blue-700';
    return 'bg-neutral-100 text-neutral-700';
}

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
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

export function PatientInfoCard({
    patient,
    badgeLabel = 'Verificado',
    emptyStateMessage = 'No hay información del paciente',
    emptyStateSubtext = 'Busque un paciente para continuar',
    lastCaseCreatedAt,
    editable = false,
    onPatientUpdated,
    hideCrearCasoLink = false
}: PatientInfoCardProps) {
    const [previousCases, setPreviousCases] = useState<Case[]>([]);
    const [loadingCases, setLoadingCases] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);

    useEffect(() => {
        if (!patient?.id) {
            setPreviousCases([]);
            return;
        }
        setLoadingCases(true);
        caseService.getCasesByPatientId(patient.id).then(setPreviousCases).finally(() => setLoadingCases(false));
    }, [patient?.id, lastCaseCreatedAt]);

    if (!patient) {
        return (
            <BaseCard variant="default" padding="lg" className="bg-white border border-neutral-200">
                <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                    <User className="w-16 h-16 mb-3 opacity-40" />
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
                    <h3 className="text-lg font-bold text-neutral-900">Información del Paciente</h3>
                    {editable ? (
                        <button
                            type="button"
                            onClick={() => setShowEditModal(true)}
                            className="inline-flex items-center gap-2 bg-white border border-neutral-300 text-blue-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors"
                        >
                            <UserRoundPen className="w-4 h-4" />
                            Editar Paciente
                        </button>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            <span className="text-xs font-medium text-green-700">{badgeLabel}</span>
                        </span>
                    )}
                </div>

                <Section icon={FileText} title="Identificación">
                    <InfoItem label="Código del Paciente" value={patient.patient_code} />
                    <InfoItem label="Número de Identificación" value={patient.identification_number} />
                </Section>

                <Section icon={User} title="Información Personal">
                    <InfoItem label="Nombre Completo" value={patient.full_name} />
                    <InfoItem label="Sexo" value={patient.gender} />
                    <InfoItem label="Fecha de Nacimiento" value={formatDate(patient.birth_date)} />
                    <InfoItem label="Edad" value={formatAge(patient.age, patient.birth_date)} />
                </Section>

                <Section icon={Building2} title="Atención">
                    <InfoItem label="Entidad" value={patient.entity_info?.entity_name} />
                    <InfoItem label="EPS" value={patient.entity_info?.eps_name} />
                    <InfoItem label="Tipo de Atención" value={patient.care_type} />
                </Section>

                <div className="bg-neutral-100 rounded-lg p-4 border border-neutral-200">
                    <div className="flex items-center gap-2 pb-3">
                        <ClipboardList className="w-5 h-5 text-lime-brand-600" />
                        <h4 className="text-sm font-semibold text-neutral-700">Casos Previos</h4>
                    </div>
                    {loadingCases ? (
                        <p className="text-sm text-neutral-500">Cargando...</p>
                    ) : previousCases.length === 0 ? (
                        <p className="text-sm text-neutral-500">No hay casos registrados</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-neutral-50">
                                        <th className="text-left py-3 px-4 font-semibold text-neutral-600">Código</th>
                                        <th className="text-left py-3 px-4 font-semibold text-neutral-600">Fecha</th>
                                        <th className="text-left py-3 px-4 font-semibold text-neutral-600">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previousCases.map(c => (
                                        <tr
                                            key={c.id}
                                            className="border-t border-neutral-100 hover:bg-lime-brand-50 transition-colors cursor-pointer"
                                            onClick={() => setSelectedCase(c)}
                                            title="Ver detalles del caso"
                                        >
                                            <td className="py-3 px-4 text-neutral-900 font-medium">{c.case_code}</td>
                                            <td className="py-3 px-4 text-neutral-600">
                                                {formatDate(getDateFromDateInfo(c.date_info, 'created_at'))}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClass(c.status)}`}>
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

                <Section icon={Phone} title="Contacto">
                    <InfoItem label="Teléfono" value={patient.phone} />
                    <InfoItem label="Correo Electrónico" value={patient.email} />
                </Section>

                <Section icon={MapPin} title="Ubicación">
                    <InfoItem label="País" value={patient.location?.country} />
                    <InfoItem label="Departamento" value={patient.location?.department} />
                    <InfoItem label="Municipio" value={patient.location?.municipality} />
                    <InfoItem label="Dirección" value={patient.location?.address} />
                </Section>

                {patient.observations && (
                    <div className="bg-neutral-100 rounded-lg p-4 border border-neutral-200">
                        <div className="flex items-center gap-2 pb-2">
                            <FileText className="w-5 h-5 text-lime-brand-600" />
                            <h4 className="text-sm font-semibold text-neutral-700">Observaciones</h4>
                        </div>
                        <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                            {patient.observations}
                        </p>
                    </div>
                )}

                {(() => {
                    const auditText = getAuditInfoText(patient);
                    return auditText ? (
                        <div className="pt-4 mt-4 border-t border-neutral-200 text-left text-sm text-neutral-500">
                            {auditText}
                        </div>
                    ) : null;
                })()}
            </div>

            {editable && (
                <EditPatientModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    patient={patient}
                    onSuccess={onPatientUpdated}
                    hideCrearCasoLink={hideCrearCasoLink}
                />
            )}

            <CaseDetailsModal
                visible={selectedCase !== null}
                caseData={selectedCase}
                onClose={() => setSelectedCase(null)}
            />
        </BaseCard>
    );
}
