'use client';

import { useState, useEffect } from 'react';
import {
    BuildingOffice2Icon,
    CheckCircleIcon,
    UserGroupIcon,
    ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton } from '@/shared/components/base';
import { statisticsService } from '../../services/statistics.service';
import type { EntityStats, EntityDetails } from '../../types/entities.types';

interface EntityDetailsModalProps {
    entity: EntityStats | null;
    period: { month: number; year: number };
    onClose: () => void;
}

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function EntityDetailsModal({ entity, period, onClose }: EntityDetailsModalProps) {
    const [entityDetails, setEntityDetails] = useState<EntityDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!entity) {
            setEntityDetails(null);
            return;
        }
        setIsLoading(true);
        statisticsService.getEntityDetails(entity.nombre, { month: period.month, year: period.year })
            .then(setEntityDetails)
            .catch(() => setEntityDetails(null))
            .finally(() => setIsLoading(false));
    }, [entity, period.month, period.year]);

    if (!entity) return null;

    const formatPeriod = () => `${MONTHS[period.month - 1]} ${period.year}`;

    const hasData = () =>
        (entity?.total ?? 0) > 0 ||
        (entityDetails?.pruebas_mas_solicitadas?.length ?? 0) > 0 ||
        (entityDetails?.pathologists?.length ?? 0) > 0;

    return (
        <BaseModal
            isOpen={!!entity}
            onClose={onClose}
            title="Detalles de la entidad"
            size="4xl"
            footer={
                <BaseButton variant="secondary" onClick={onClose}>
                    Cerrar
                </BaseButton>
            }
        >
            <div className="space-y-4 sm:space-y-5">
                <p className="text-sm text-neutral-500">Período: {formatPeriod()}</p>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5 border border-blue-100">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <BuildingOffice2Icon className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="text-2xl font-bold text-neutral-900">{entity.nombre}</h4>
                            <p className="text-blue-600 font-medium">Entidad</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 font-medium">Ambulatorios</p>
                                <p className="text-2xl font-bold text-green-700">{entity.ambulatorios}</p>
                                <p className="text-xs text-green-600">casos</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 font-medium">Hospitalizados</p>
                                <p className="text-2xl font-bold text-blue-700">{entity.hospitalizados}</p>
                                <p className="text-xs text-blue-600">casos</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <BuildingOffice2Icon className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-neutral-100 border border-neutral-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-600 font-medium">Total</p>
                                <p className="text-2xl font-bold text-neutral-800">{entity.total}</p>
                                <p className="text-xs text-neutral-500">casos</p>
                            </div>
                            <div className="w-12 h-12 bg-neutral-200 rounded-full flex items-center justify-center">
                                <UserGroupIcon className="w-6 h-6 text-neutral-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {!isLoading && !hasData() ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                        <p className="text-lg font-semibold text-amber-800 mb-2">No hay datos disponibles</p>
                        <p className="text-amber-700 mb-4">
                            No se encontraron datos para la entidad <strong>{entity.nombre}</strong> en {formatPeriod()}.
                        </p>
                        <div className="text-sm text-amber-600 text-left max-w-md mx-auto">
                            <p>Sugerencias:</p>
                            <ul className="mt-2 space-y-1 list-disc list-inside">
                                <li>Verifica que la entidad tenga casos registrados</li>
                                <li>Intenta con un período diferente</li>
                                <li>Asegúrate de que los datos estén cargados en el sistema</li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                        <div className="bg-neutral-50 rounded-xl p-4 sm:p-5 space-y-3">
                            <h5 className="text-lg font-semibold text-neutral-900">Pruebas más solicitadas</h5>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-6">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                                    <span className="ml-2 text-neutral-600">Cargando pruebas...</span>
                                </div>
                            ) : !entityDetails?.pruebas_mas_solicitadas?.length ? (
                                <div className="text-center py-6 text-neutral-500">
                                    <ClipboardDocumentListIcon className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                                    <p>No se encontraron pruebas</p>
                                </div>
                            ) : (
                                <div className="space-y-2 sm:space-y-3">
                                    {entityDetails.pruebas_mas_solicitadas.map((prueba) => (
                                        <div
                                            key={prueba.codigo}
                                            className="bg-white rounded-lg p-3 sm:p-4 border border-neutral-200"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h6 className="text-sm font-medium text-neutral-900">
                                                        {prueba.nombre || prueba.codigo}
                                                    </h6>
                                                    <p className="text-xs text-neutral-500">{prueba.codigo}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-blue-600">
                                                        {prueba.total_solicitudes}
                                                    </div>
                                                    <div className="text-xs text-neutral-500">solicitudes</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-neutral-50 rounded-xl p-4 sm:p-5 space-y-3">
                            <h5 className="text-lg font-semibold text-neutral-900">Patólogos</h5>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-6">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                                    <span className="ml-2 text-neutral-600">Cargando patólogos...</span>
                                </div>
                            ) : !entityDetails?.pathologists?.length ? (
                                <div className="text-center py-6 text-neutral-500">
                                    <UserGroupIcon className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                                    <p>No se encontraron patólogos</p>
                                </div>
                            ) : (
                                <div className="space-y-2 sm:space-y-3">
                                    {entityDetails?.pathologists?.map((p) => (
                                        <div
                                            key={p.codigo}
                                            className="bg-white rounded-lg p-3 sm:p-4 border border-neutral-200"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h6 className="text-sm font-medium text-neutral-900">{p.name}</h6>
                                                    <p className="text-xs text-neutral-500">{p.codigo}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-green-600">{p.casesCount}</div>
                                                    <div className="text-xs text-neutral-500">casos</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </BaseModal>
    );
}
