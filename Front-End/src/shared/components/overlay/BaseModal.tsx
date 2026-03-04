'use client';

import { Fragment, type ReactNode } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type BaseModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
    className?: string;
};

export const BaseModal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    className,
}: BaseModalProps) => {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        full: 'max-w-full mx-4',
    };

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
                    <div className="fixed inset-0 bg-neutral-900/50 transition-opacity backdrop-blur-xs" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-4 lg:p-6">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel
                                className={twMerge(
                                    'relative flex max-h-[90vh] flex-col overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 w-full',
                                    sizeClasses[size],
                                    className
                                )}
                            >
                                {/* Header */}
                                <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
                                    <div className="text-lg font-semibold leading-6 text-neutral-900">
                                        {title}
                                    </div>
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-neutral-400 hover:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-lime-brand-500 focus:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Cerrar</span>
                                        <X className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>

                                {/* Footer */}
                                {footer && (
                                    <div className="shrink-0 bg-neutral-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-neutral-200">
                                        {footer}
                                    </div>
                                )}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
