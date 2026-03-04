'use client';

import { Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { CheckCircle2, ClipboardPlus } from 'lucide-react';
import { BaseButton } from '@/shared/components/base';
import Link from 'next/link';

export interface ApprovalSuccessCaseData {
    code?: string;
    original_case_code?: string;
    patient?: { name?: string };
    additional_tests?: { code: string; name: string; quantity: number }[];
    created_at?: string;
    state?: string;
}

interface AdditionalTestsSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseData: ApprovalSuccessCaseData | null;
}

function formatDate(s?: string): string {
    if (!s) return 'N/D';
    try {
        return new Date(s).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'N/A';
    }
}

export function AdditionalTestsSuccessModal({
    isOpen,
    onClose,
    caseData
}: AdditionalTestsSuccessModalProps) {
    const caseCode = caseData?.code || caseData?.original_case_code || 'N/D';
    const patientName = caseData?.patient?.name || 'N/D';
    const tests = caseData?.additional_tests || [];

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-neutral-900/50 transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full max-w-2xl rounded-xl bg-white shadow-xl overflow-hidden">
                                <div className="px-6 py-6 border-b border-neutral-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-7 h-7 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-neutral-900">
                                                Pruebas adicionales aprobadas
                                            </h3>
                                            <p className="text-neutral-600 text-sm mt-1">
                                                La solicitud de pruebas adicionales fue aprobada correctamente.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                                        <p className="text-xs uppercase tracking-wide text-neutral-500 font-medium mb-1">
                                            Código de referencia
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-semibold text-neutral-900 font-mono">
                                                {caseCode}
                                            </span>
                                            <ClipboardPlus className="w-5 h-5 text-neutral-400" />
                                        </div>
                                        <p className="text-sm text-neutral-600 mt-2">
                                            Paciente: <span className="font-semibold text-neutral-900">{patientName}</span>
                                        </p>
                                    </div>

                                    {tests.length > 0 && (
                                        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                                            <p className="text-xs uppercase tracking-wide text-neutral-500 font-medium mb-2">
                                                Pruebas adicionales
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {tests.map((t, i) => (
                                                    <span
                                                        key={i}
                                                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800"
                                                    >
                                                        {t.code} - {t.name} (x{t.quantity})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {caseData?.created_at && (
                                        <p className="text-sm text-neutral-500">
                                            Creado el {formatDate(caseData.created_at)}
                                        </p>
                                    )}
                                </div>

                                <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3">
                                    <BaseButton size="sm" onClick={onClose}>
                                        Cerrar
                                    </BaseButton>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}


