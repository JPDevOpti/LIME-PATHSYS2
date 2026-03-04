import { X, Calendar, User, FlaskConical, Hash, FileText, Phone, MapPin, Building2 } from 'lucide-react';
import { LegacyCase } from '../types/case-legacy.types';
import { formatAge } from '@/shared/utils/formatAge';
import { BaseCard } from '@/shared/components/base/BaseCard';

interface LegacyCaseDetailsModalProps {
    visible: boolean;
    caseData: LegacyCase | null;
    onClose: () => void;
}

function parseDateValue(v?: any): Date | null {
    if (!v) return null;
    // handle ISO string or timestamp
    if (typeof v === 'string' || typeof v === 'number') {
        const d = new Date(v);
        if (!isNaN(d.getTime())) return d;
    }
    // handle Mongo export shapes: { $date: '...' } or { $date: { $numberLong: '...' } }
    if (typeof v === 'object') {
        if (v.$date) {
            const inner = v.$date;
            if (typeof inner === 'string' || typeof inner === 'number') {
                const d = new Date(inner);
                if (!isNaN(d.getTime())) return d;
            }
            if (inner?.$numberLong) {
                const d = new Date(Number(inner.$numberLong));
                if (!isNaN(d.getTime())) return d;
            }
        }
        if (v.$numberLong) {
            const d = new Date(Number(v.$numberLong));
            if (!isNaN(d.getTime())) return d;
        }
    }
    return null;
}

function formatDate(v?: any) {
    const d = parseDateValue(v);
    if (!d) return 'N/A';
    return d.toLocaleString('es-CO');
}

function computeAgeFromBirth(birth?: any) {
    const d = parseDateValue(birth);
    if (!d) return undefined;
    const diff = Date.now() - d.getTime();
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    return years;
}

export function LegacyCaseDetailsModal({ visible, caseData, onClose }: LegacyCaseDetailsModalProps) {
    if (!visible || !caseData) return null;

    // Combina los datos del paciente (legacy snapshot) y normaliza para mostrar
    const p = caseData.patient || {};
    const displayPatient = {
        id: caseData.patient_id || p._id || undefined,
        patient_code: p.patient_code || p.patient_code || undefined,
        identification_number: p.identification_number || p.identification || p.identificacion || undefined,
        identification_type: p.identification_type || undefined,
        full_name: p.full_name || [p.first_name, p.second_name, p.first_lastname, p.second_lastname].filter(Boolean).join(' ') || undefined,
        first_name: p.first_name || undefined,
        second_name: p.second_name || undefined,
        first_lastname: p.first_lastname || undefined,
        second_lastname: p.second_lastname || undefined,
        gender: p.gender || undefined,
        birth_date: p.birth_date || p.birthDate || p.fecha_nacimiento || undefined,
        phone: p.phone || undefined,
        email: p.email || undefined,
        care_type: p.care_type || caseData.care_type || undefined,
        entity_info: p.entity_info || { entity_name: caseData.entity || undefined, eps_name: undefined },
        location: p.location || {},
        observations: p.observations || undefined,
        age: p.age || computeAgeFromBirth(p.birth_date || p.birthDate || p.fecha_nacimiento) || undefined,
    };

    const InfoItem = ({ label, value }: { label: string; value?: string | number | undefined }) => {
        if (value === undefined || value === null || value === '') return null;
        return (
            <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <p className="text-sm text-gray-900 break-all">{String(value)}</p>
            </div>
        );
    };

    const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
        <BaseCard variant="muted" padding="md">
            <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2">
                    <Icon className="w-5 h-5 text-lime-brand-600" />
                    <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
            </div>
        </BaseCard>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />
            <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-lime-brand-100 flex items-center justify-center text-lime-brand-600">
                            <Hash className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Caso Histórico: {caseData.legacy_id}</h2>
                            <p className="text-sm text-gray-500">ID Interno: {caseData.id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content: todo vertical, cards clínico y cronología */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6 max-w-2xl mx-auto">
                        {/* Info Paciente: estilo similar al modal de paciente general */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <Section icon={FileText} title="Identificación">
                                    <div className="sm:col-span-2">
                                        <InfoItem label="Código del Paciente" value={displayPatient.patient_code} />
                                    </div>
                                    <InfoItem label="Número de Identificación" value={displayPatient.identification_number} />
                                    <InfoItem label="Tipo de Identificación" value={displayPatient.identification_type} />
                                </Section>

                                <Section icon={User} title="Información Personal">
                                    <InfoItem label="Nombre Completo" value={displayPatient.full_name} />
                                    <InfoItem label="Sexo" value={displayPatient.gender} />
                                    <InfoItem label="Fecha de Nacimiento" value={displayPatient.birth_date ? formatDate(displayPatient.birth_date) : undefined} />
                                    <InfoItem label="Edad" value={formatAge(displayPatient.age, displayPatient.birth_date instanceof Date ? displayPatient.birth_date.toISOString().split('T')[0] : displayPatient.birth_date)} />
                                </Section>

                                <Section icon={Phone} title="Contacto">
                                    <InfoItem label="Teléfono" value={displayPatient.phone} />
                                    <InfoItem label="Correo Electrónico" value={displayPatient.email} />
                                </Section>
                            </div>
                            <div className="space-y-6">
                                <Section icon={MapPin} title="Ubicación">
                                    <InfoItem label="Departamento" value={displayPatient.location?.department} />
                                    <InfoItem label="Municipio" value={displayPatient.location?.municipality} />
                                    <InfoItem label="Dirección" value={displayPatient.location?.address} />
                                </Section>

                                <Section icon={Building2} title="Atención">
                                    <InfoItem label="Entidad" value={displayPatient.entity_info?.entity_name} />
                                    <InfoItem label="EPS" value={displayPatient.entity_info?.eps_name} />
                                    <InfoItem label="Tipo de Atención" value={displayPatient.care_type} />
                                </Section>

                                {displayPatient.observations && (
                                    <Section icon={FileText} title="Observaciones">
                                        <div className="sm:col-span-2">
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{displayPatient.observations}</p>
                                        </div>
                                    </Section>
                                )}
                            </div>
                        </div>

                        {/* Cronología del Caso */}
                        <section className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-lime-brand-600" />
                                Cronología del Caso
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-xs text-gray-500 block">Fecha de Recepción</span>
                                    <span className="text-sm font-medium text-gray-900">{formatDate(caseData.received_at)}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block">Fecha de Cierre/Corte</span>
                                    <span className="text-sm font-medium text-gray-900">{formatDate(caseData.closed_at)}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block">Fecha de Transcripción</span>
                                    <span className="text-sm font-medium text-gray-900">{formatDate(caseData.transcription_date)}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block">Fecha de Importación (Migración)</span>
                                    <span className="text-sm font-medium text-gray-900">{formatDate(caseData.imported_at)}</span>
                                </div>
                            </div>
                        </section>

                        {/* Información adicional */}
                        <section className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-lime-brand-600" />
                                Información adicional
                            </h3>
                            <div className="space-y-4">
                                {caseData.previous_study && (
                                    <div>
                                        <span className="text-xs font-semibold text-gray-700 block mb-1">Estudio Previo</span>
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{caseData.previous_study}</p>
                                    </div>
                                )}
                                {!caseData.previous_study && (
                                    <p className="text-sm text-gray-500 italic">No hay información adicional registrada en el sistema histórico.</p>
                                )}
                            </div>
                        </section>

                        {/* Samples */}
                        <section className="mt-6">
                            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2 px-1">
                                <FlaskConical className="w-4 h-4 text-lime-brand-600" />
                                Muestras Analizadas ({caseData.samples?.length || 0})
                            </h3>
                            <div className="space-y-4">
                                {caseData.samples?.map((sample, idx) => (
                                    <div key={idx} className="bg-white border text-left border-gray-200 rounded-xl p-5 shadow-sm">
                                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                                            <h4 className="font-bold text-gray-800 text-sm">
                                                Muestra #{sample.number || (idx + 1)}
                                            </h4>
                                            <span className="text-xs font-medium px-2.5 py-1 rounded bg-lime-brand-50 text-lime-brand-700">
                                                {sample.test_type || 'Prueba no especificada'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                            <div>
                                                <span className="text-xs text-gray-500 block mb-1">Localización Anatómica</span>
                                                <span className="text-sm text-gray-900">{sample.anatomical_location || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-500 block mb-1">Servicio de Laboratorio</span>
                                                <span className="text-sm text-gray-900">{sample.lab_service || '-'}</span>
                                            </div>
                                            {sample.macroscopic && (
                                                <div className="md:col-span-2">
                                                    <span className="text-xs text-gray-500 block mb-1">Descripción Macroscópica</span>
                                                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md border border-gray-100 max-h-40 overflow-y-auto whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sample.macroscopic }} />
                                                </div>
                                            )}
                                            {sample.microscopic && (
                                                <div className="md:col-span-2">
                                                    <span className="text-xs text-gray-500 block mb-1">Descripción Microscópica</span>
                                                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md border border-gray-100 max-h-40 overflow-y-auto whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sample.microscopic }} />
                                                </div>
                                            )}
                                            {sample.note && (
                                                <div className="md:col-span-2">
                                                    <span className="text-xs text-gray-500 block mb-1">Nota Adicional</span>
                                                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md border border-gray-100 max-h-40 overflow-y-auto whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sample.note }} />
                                                </div>
                                            )}
                                            {sample.histoquimica && (
                                                <div>
                                                    <span className="text-xs text-gray-500 block mb-1">Histoquímica</span>
                                                    <span className="text-sm text-gray-900">{sample.histoquimica}</span>
                                                </div>
                                            )}
                                            {sample.inmunohistoquimica && (
                                                <div>
                                                    <span className="text-xs text-gray-500 block mb-1">Inmunohistoquímica</span>
                                                    <span className="text-sm text-gray-900">{sample.inmunohistoquimica}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {!caseData.samples?.length && (
                                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                                        <p className="text-gray-500 text-sm">No hay muestras registradas para este caso histórico.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
