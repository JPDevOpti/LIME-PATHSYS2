'use client';

import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { CloseButton } from '@/shared/components/ui/buttons';
import { type CasoUrgente } from '../types/dashboard.types';
import {
    FileText,
    User,
    Building2,
    Stethoscope,
    Calendar,
    TestTube,
    Clock,
} from 'lucide-react';
import { clsx } from 'clsx';

type UrgentCaseDetailsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    caseItem: CasoUrgente | null;
};

export const UrgentCaseDetailsModal = ({
    isOpen,
    onClose,
    caseItem,
}: UrgentCaseDetailsModalProps) => {
    if (!caseItem) return null;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const isUrgent = caseItem.dias_en_sistema >= 5 && caseItem.estado !== 'Completado';

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            size="lg"
            title={
                <div className="flex items-center gap-3">
                    <div className="bg-lime-blue-50 p-2 rounded-lg">
                        <FileText className="h-6 w-6 text-lime-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-neutral-900">
                            Caso {caseItem.codigo}
                        </h3>
                        <span className="text-sm font-normal text-neutral-500">
                            Detalles y estado actual
                        </span>
                    </div>
                </div>
            }
            footer={<CloseButton onClick={onClose} size="sm" />}
        >
            <div className="space-y-6">
                {/* Status Header */}
                <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-neutral-100">
                    <span className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        caseItem.estado === 'Completado' ? 'bg-success-50 text-success-700' : 'bg-lime-blue-50 text-lime-blue-700'
                    )}>
                        {caseItem.estado}
                    </span>
                    <span className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                        caseItem.prioridad === 'Prioritario' ? 'bg-danger-50 text-danger-700 border-danger-100' : 'bg-success-50 text-success-700 border-success-100'
                    )}>
                        {caseItem.prioridad}
                    </span>
                    {isUrgent && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Clock className="w-3 h-3 mr-1" /> {caseItem.dias_en_sistema} días en sistema
                        </span>
                    )}
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Patient */}
                    <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                        <div className="flex items-center gap-2 mb-1 text-xs font-medium text-neutral-500 uppercase">
                            <User className="w-3 h-3" /> Paciente
                        </div>
                        <p className="font-semibold text-neutral-900">{caseItem.paciente.nombre}</p>
                        <p className="text-sm text-neutral-500">{caseItem.paciente.cedula}</p>
                    </div>

                    {/* Entity */}
                    <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                        <div className="flex items-center gap-2 mb-1 text-xs font-medium text-neutral-500 uppercase">
                            <Building2 className="w-3 h-3" /> Entidad
                        </div>
                        <p className="font-semibold text-neutral-900">{caseItem.paciente.entidad || 'No especificada'}</p>
                    </div>

                    {/* Pathologist */}
                    <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                        <div className="flex items-center gap-2 mb-1 text-xs font-medium text-neutral-500 uppercase">
                            <Stethoscope className="w-3 h-3" /> Patólogo
                        </div>
                        <p className="font-semibold text-neutral-900">{caseItem.patologo}</p>
                    </div>

                    {/* Date */}
                    <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                        <div className="flex items-center gap-2 mb-1 text-xs font-medium text-neutral-500 uppercase">
                            <Calendar className="w-3 h-3" /> Fecha Creación
                        </div>
                        <p className="font-semibold text-neutral-900">{formatDate(caseItem.fecha_creacion)}</p>
                    </div>
                </div>

                {/* Tests Section */}
                <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <div className="p-1.5 bg-lime-blue-50 rounded-md">
                            <TestTube className="w-4 h-4 text-lime-blue-600" />
                        </div>
                        <h4 className="font-semibold text-neutral-900">Pruebas Solicitadas</h4>
                        <span className="bg-neutral-100 text-neutral-600 text-xs font-medium px-2 py-0.5 rounded-full">
                            {caseItem.pruebas.length}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {caseItem.pruebas.map((prueba, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-white border border-neutral-200 text-neutral-700 shadow-xs"
                            >
                                {prueba}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};
