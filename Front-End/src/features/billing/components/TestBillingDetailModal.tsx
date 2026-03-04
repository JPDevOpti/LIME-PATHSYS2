'use client';

import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton } from '@/shared/components/base';
import { BillingTestDetail } from '../types/billing.types';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

interface TestBillingDetailModalProps {
    detail: BillingTestDetail | null;
    isOpen: boolean;
    onClose: () => void;
    isLoading?: boolean;
}

export function TestBillingDetailModal({ detail, isOpen, onClose, isLoading }: TestBillingDetailModalProps) {
    if (!detail && !isLoading) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={detail ? `Detalle de Facturación: ${detail.nombre}` : 'Cargando detalle...'}
            size="2xl"
            footer={
                <BaseButton onClick={onClose} variant="secondary" size="sm">
                    Cerrar
                </BaseButton>
            }
        >
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-lime-brand-500 border-t-transparent mb-4"></div>
                    <p className="text-neutral-500 font-medium">Cargando información detallada...</p>
                </div>
            ) : detail && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                        <div>
                            <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Código de Prueba</span>
                            <p className="text-lg font-mono font-bold text-neutral-900">{detail.codigo}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Total Generado</span>
                            <p className="text-lg font-bold text-lime-brand-700">{formatCurrency(detail.total_monto)}</p>
                        </div>
                        <div>
                            <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Total Cantidad</span>
                            <p className="text-lg font-bold text-neutral-900">{detail.total_cantidad} pruebas</p>
                        </div>
                    </div>

                    <div className="overflow-hidden border border-neutral-200 rounded-xl">
                        <table className="min-w-full divide-y divide-neutral-200">
                            <thead className="bg-neutral-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-neutral-500 uppercase">Entidad</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-neutral-500 uppercase">Cantidad</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-neutral-500 uppercase">P. Unitario</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-neutral-500 uppercase">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-neutral-200">
                                {detail.detalles_por_entidad.map((ent, idx) => (
                                    <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-medium text-neutral-900">{ent.entidad}</span>
                                                {ent.tiene_convenio && (
                                                    <CheckBadgeIcon 
                                                        className="w-4 h-4 text-blue-500" 
                                                        title="Esta entidad tiene convenio activo para esta prueba"
                                                    />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-neutral-700 font-medium">
                                            {ent.cantidad}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm text-neutral-600">
                                            {formatCurrency(ent.precio_unitario)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-neutral-900">
                                            {formatCurrency(ent.monto)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-neutral-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                        <CheckBadgeIcon className="w-4 h-4 text-blue-500 shrink-0" />
                        <p>Los elementos marcados con el sello azul indican que se aplicó un <strong>precio de convenio</strong> configurado para esa entidad específica.</p>
                    </div>
                </div>
            )}
        </BaseModal>
    );
}
