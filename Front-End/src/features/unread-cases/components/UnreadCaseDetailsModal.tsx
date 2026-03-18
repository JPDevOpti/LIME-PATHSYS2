'use client';

import { CircleX, SquarePen } from 'lucide-react';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton } from '@/shared/components/base';
import type { UnreadCase } from '../types/unread-cases.types';

function formatDate(s?: string): string {
    if (!s) return '-';
    try {
        return new Date(s).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return s;
    }
}

function getTestTypeLabel(type: string): string {
    const map: Record<string, string> = {
        LOW_COMPLEXITY_IHQ: 'IHQ Baja Complejidad',
        HIGH_COMPLEXITY_IHQ: 'IHQ Alta Complejidad',
        SPECIAL_IHQ: 'IHQ Especiales',
        HISTOCHEMISTRY: 'Histoquímica'
    };
    return map[type] || type;
}

interface UnreadCaseDetailsModalProps {
    caseData: UnreadCase | null;
    onClose: () => void;
    onEdit: (c: UnreadCase) => void;
    onDelete: (c: UnreadCase) => void;
}

export function UnreadCaseDetailsModal({ caseData, onClose, onEdit, onDelete }: UnreadCaseDetailsModalProps) {
    if (!caseData) return null;

    return (
        <BaseModal
            isOpen={!!caseData}
            onClose={onClose}
            title="Detalles del caso sin lectura"
            size="4xl"
            footer={
                <div className="flex justify-end gap-2">
                    {caseData.status !== 'Completado' && (
                        <>
                            <BaseButton
                                variant="danger"
                                size="sm"
                                onClick={() => onDelete(caseData)}
                                startIcon={<CircleX className="w-4 h-4" />}
                            >
                                Eliminar
                            </BaseButton>
                            <BaseButton
                                variant="secondary"
                                size="sm"
                                onClick={() => onEdit(caseData)}
                                className="bg-green-600 text-white border-green-600 hover:bg-green-700 hover:border-green-700"
                                startIcon={<SquarePen className="w-4 h-4" />}
                            >
                                Editar
                            </BaseButton>
                        </>
                    )}
                    <BaseButton variant="secondary" size="sm" onClick={onClose}>
                        Cerrar
                    </BaseButton>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-xl">
                    <div>
                        <p className="text-xs text-neutral-500 uppercase">Código</p>
                        <p className="font-medium text-neutral-900">{caseData.caseCode}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase">Estado</p>
                        <p className="font-medium text-neutral-900">{caseData.status || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase">Paciente</p>
                        <p className="font-medium text-neutral-900">
                            {caseData.patientName || (caseData.isSpecialCase ? 'Caso Especial' : '-')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase">Documento</p>
                        <p className="font-medium text-neutral-900">
                            {caseData.patientDocument || (caseData.isSpecialCase ? 'Lab. Externo' : '-')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase">Institución</p>
                        <p className="font-medium text-neutral-900">{caseData.institution || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase">N. caso externo</p>
                        <p className="font-medium text-neutral-900">{caseData.externalCaseNumber || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase">N° Placas</p>
                        <p className="font-medium text-neutral-900">{caseData.numberOfPlates ?? 0}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase">Fecha ingreso</p>
                        <p className="font-medium text-neutral-900">{formatDate(caseData.entryDate)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 uppercase">Fecha entrega</p>
                        <p className="font-medium text-neutral-900">
                            {caseData.deliveryDate ? formatDate(caseData.deliveryDate) : 'Pendiente'}
                        </p>
                    </div>
                </div>

                {caseData.testGroups && caseData.testGroups.length > 0 && (
                    <div>
                        <p className="text-xs text-neutral-500 uppercase mb-2">Pruebas</p>
                        <div className="space-y-3">
                            {caseData.testGroups.map((group, i) => (
                                <div
                                    key={i}
                                    className="p-4 rounded-lg border border-neutral-200 bg-neutral-50"
                                >
                                    <p className="text-sm font-semibold text-neutral-900 mb-2">
                                        {getTestTypeLabel(group.type)}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {group.tests.map((t, j) => (
                                            <span
                                                key={j}
                                                className="inline-flex px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-800"
                                            >
                                                {t.code} x{t.quantity}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {caseData.notes && (
                    <div>
                        <p className="text-xs text-neutral-500 uppercase mb-1">Observaciones</p>
                        <p className="text-sm text-neutral-800 whitespace-pre-wrap">{caseData.notes}</p>
                    </div>
                )}

                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-3">
                    <p className="text-xs text-neutral-500 uppercase font-medium">Información de auditoría</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-neutral-500">Ingreso</p>
                            <p className="font-medium text-neutral-900">
                                {formatDate(caseData.entryDate || caseData.createdAt)} - {caseData.receivedBy || '-'}
                            </p>
                        </div>
                        {caseData.updatedAt && caseData.updatedAt !== caseData.createdAt && (
                            <div>
                                <p className="text-neutral-500">Modificación</p>
                                <p className="font-medium text-neutral-900">
                                    {formatDate(caseData.updatedAt)} - {caseData.updatedBy || '-'}
                                </p>
                            </div>
                        )}
                        {caseData.deliveryDate && (
                            <div>
                                <p className="text-neutral-500">Entrega</p>
                                <p className="font-medium text-neutral-900">
                                    {formatDate(caseData.deliveryDate)} - {caseData.deliveredTo || '-'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </BaseModal>
    );
}
