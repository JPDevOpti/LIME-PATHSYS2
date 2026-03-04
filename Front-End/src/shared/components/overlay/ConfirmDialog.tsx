'use client';

import { Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { BaseButton } from '@/shared/components/base';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    subtitle?: string;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
    variant?: 'danger' | 'primary' | 'warning';
}

export function ConfirmDialog({
    isOpen,
    onClose,
    title,
    message,
    subtitle,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    loading = false,
    onConfirm,
    onCancel,
    variant = 'primary'
}: ConfirmDialogProps) {
    const handleConfirm = async () => {
        await onConfirm();
    };

    const handleCancel = () => {
        onCancel?.();
        onClose();
    };

    const buttonVariant = variant === 'danger' ? 'danger' : 'primary';

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
                            <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                                <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
                                {subtitle && (
                                    <p className="mt-1 text-sm font-medium text-neutral-600">{subtitle}</p>
                                )}
                                <p className="mt-3 text-sm text-neutral-600">{message}</p>
                                <div className="mt-6 flex justify-end gap-3">
                                    <BaseButton
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleCancel}
                                        disabled={loading}
                                    >
                                        {cancelText}
                                    </BaseButton>
                                    <BaseButton
                                        variant={buttonVariant}
                                        size="sm"
                                        onClick={handleConfirm}
                                        disabled={loading}
                                    >
                                        {loading ? 'Procesando...' : confirmText}
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
