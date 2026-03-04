'use client';

import { useState, useEffect } from 'react';
import {
    UserCircleIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    BuildingOffice2Icon,
    ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { BaseButton } from '@/shared/components/base';
import { statisticsService } from '../../services/statistics.service';
import type { PathologistPerformance } from '../../types/statistics.types';

interface EntityDetail { name: string; codigo: string; casesCount: number; }
interface TestDetail { name: string; codigo: string; count: number; }

interface PathologistDetailsModalProps {
    pathologist: PathologistPerformance | null;
    period: { month: number; year: number };
    onClose: () => void;
}

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function PathologistDetailsModal({ pathologist, period, onClose }: PathologistDetailsModalProps) {
    const [entitiesData, setEntitiesData] = useState<EntityDetail[]>([]);
    const [testsData, setTestsData] = useState<TestDetail[]>([]);
    const [isLoadingEntities, setIsLoadingEntities] = useState(false);
    const [isLoadingTests, setIsLoadingTests] = useState(false);

    useEffect(() => {
        if (!pathologist) {
            setEntitiesData([]);
            setTestsData([]);
            return;
        }
        setIsLoadingEntities(true);
        setIsLoadingTests(true);
        statisticsService.getPathologistEntities(pathologist.name, period.month, period.year)
            .then((res) => setEntitiesData(res.entidades ?? []))
            .catch(() => setEntitiesData([]))
            .finally(() => setIsLoadingEntities(false));
        statisticsService.getPathologistTests(pathologist.name, period.month, period.year)
            .then((res) => setTestsData(res.pruebas ?? []))
            .catch(() => setTestsData([]))
            .finally(() => setIsLoadingTests(false));
    }, [pathologist, period.month, period.year]);

    if (!pathologist) return null;

    const formatPeriod = () => `${MONTHS[period.month - 1]} ${period.year}`;

    return (
        <BaseModal
            isOpen={!!pathologist}
            onClose={onClose}
            title="Detalles del patólogo"
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
                            <UserCircleIcon className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="text-2xl font-bold text-neutral-900">{pathologist.name}</h4>
                            <p className="text-blue-600 font-medium">Patólogo</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 font-medium">Dentro de oportunidad</p>
                                <p className="text-2xl font-bold text-green-700">{pathologist.withinOpportunity}</p>
                                <p className="text-xs text-green-600">casos</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-red-600 font-medium">Fuera de oportunidad</p>
                                <p className="text-2xl font-bold text-red-700">{pathologist.outOfOpportunity}</p>
                                <p className="text-xs text-red-600">casos</p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <XCircleIcon className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 font-medium">Tiempo promedio</p>
                                <p className="text-2xl font-bold text-blue-700">
                                    {pathologist.avgTime?.toFixed(1) ?? '0.0'} días
                                </p>
                                <p className="text-xs text-blue-600">por caso</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <ClockIcon className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-neutral-100 border border-neutral-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-neutral-600 font-medium">Total de casos</p>
                                <p className="text-2xl font-bold text-neutral-800">
                                    {pathologist.withinOpportunity + pathologist.outOfOpportunity}
                                </p>
                                <p className="text-xs text-neutral-500">período</p>
                            </div>
                            <div className="w-12 h-12 bg-neutral-200 rounded-full flex items-center justify-center">
                                <ClipboardDocumentListIcon className="w-6 h-6 text-neutral-600" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    <div className="bg-neutral-50 rounded-xl p-4 sm:p-5 space-y-3">
                        <h5 className="text-lg font-semibold text-neutral-900">Entidades donde trabaja</h5>
                        {isLoadingEntities ? (
                            <div className="flex items-center justify-center py-6">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                                <span className="ml-2 text-neutral-600">Cargando entidades...</span>
                            </div>
                        ) : entitiesData.length === 0 ? (
                            <div className="text-center py-6 text-neutral-500">
                                <BuildingOffice2Icon className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                                <p>No se encontraron entidades</p>
                            </div>
                        ) : (
                            <div className="space-y-2 sm:space-y-3">
                                {entitiesData.map((entity) => (
                                    <div
                                        key={entity.name}
                                        className="bg-white rounded-lg p-4 sm:p-5 border border-neutral-200"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0">
                                                    <BuildingOffice2Icon className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h6 className="text-sm font-medium text-neutral-900">
                                                        {entity.name}
                                                    </h6>
                                                    <p className="text-xs text-neutral-500">{entity.codigo}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-blue-600">
                                                    {entity.casesCount}
                                                </div>
                                                <div className="text-xs text-neutral-500">casos</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-neutral-50 rounded-xl p-4 sm:p-5 space-y-3">
                        <h5 className="text-lg font-semibold text-neutral-900">Pruebas realizadas</h5>
                        {isLoadingTests ? (
                            <div className="flex items-center justify-center py-6">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                                <span className="ml-2 text-neutral-600">Cargando pruebas...</span>
                            </div>
                        ) : testsData.length === 0 ? (
                            <div className="text-center py-6 text-neutral-500">
                                <CheckCircleIcon className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                                <p>No se encontraron pruebas</p>
                            </div>
                        ) : (
                            <div className="space-y-2 sm:space-y-3">
                                {testsData.map((test, idx) => (
                                    <div
                                        key={test.codigo || `${test.name}-${idx}`}
                                        className="bg-white rounded-lg p-4 sm:p-5 border border-neutral-200"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0">
                                                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <h6 className="text-sm font-medium text-neutral-900">
                                                        {test.name}
                                                    </h6>
                                                    <p className="text-xs text-neutral-500">{test.codigo}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-green-600">
                                                    {test.count}
                                                </div>
                                                <div className="text-xs text-neutral-500">realizadas</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </BaseModal>
    );
}
