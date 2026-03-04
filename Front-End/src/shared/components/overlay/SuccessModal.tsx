'use client';

import { Fragment, type ReactNode } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { CheckCircle2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export type SuccessModalVariant = 'create' | 'edit';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: ReactNode;
    description: ReactNode;
    variant?: SuccessModalVariant;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
    children: ReactNode;
    footer?: ReactNode;
    /** Si true, el footer usa justify-between (metadata izq, botones der) */
    footerSpread?: boolean;
    headerRight?: ReactNode;
    className?: string;
}

const variantStyles = {
    create: {
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600'
    },
    edit: {
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600'
    }
};

export function SuccessModal({
    isOpen,
    onClose,
    title,
    description,
    variant = 'create',
    size = '3xl',
    children,
    footer,
    footerSpread = false,
    headerRight,
    className
}: SuccessModalProps) {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        '6xl': 'max-w-6xl',
        '7xl': 'max-w-7xl',
        full: 'max-w-full mx-4'
    };

    const styles = variantStyles[variant];

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
                            <DialogPanel
                                className={twMerge(
                                    'relative flex flex-col max-h-[90vh] rounded-xl bg-white shadow-xl overflow-hidden w-full',
                                    sizeClasses[size],
                                    className
                                )}
                            >
                                {/* Header fijo */}
                                <div className="flex-shrink-0 flex items-start gap-4 pb-4 pt-6 px-6 border-b border-neutral-200">
                                    <div className={twMerge('w-14 h-14 shrink-0 rounded-full flex items-center justify-center', styles.iconBg)}>
                                        <CheckCircle2 className={twMerge('w-8 h-8', styles.iconColor)} />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        {typeof title === 'string' ? (
                                            <h2 className="text-2xl font-bold text-neutral-900">{title}</h2>
                                        ) : (
                                            title
                                        )}
                                        <div className="text-sm text-neutral-600">{description}</div>
                                    </div>
                                    {headerRight && (
                                        <div className="shrink-0 text-right text-sm">{headerRight}</div>
                                    )}
                                </div>

                                {/* Contenido scrolleable */}
                                <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
                                    {children}
                                </div>

                                {/* Footer fijo */}
                                {footer && (
                                    <div
                                        className={twMerge(
                                            'flex-shrink-0 w-full flex gap-3 pt-4 pb-6 px-6 border-t border-neutral-200 bg-white',
                                            footerSpread ? 'justify-between items-center' : 'justify-end items-center'
                                        )}
                                    >
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
}
