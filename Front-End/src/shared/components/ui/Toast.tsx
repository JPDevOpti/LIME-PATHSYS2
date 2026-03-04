'use client';

import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';

interface ToastProps {
    title?: string;
    message: string;
    visible: boolean;
    onDismiss: () => void;
    duration?: number;
    variant?: 'success' | 'error' | 'info';
}

const variantStyles = {
    success: {
        container: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        icon: 'text-emerald-600',
    },
    error: {
        container: 'border-red-200 bg-red-50 text-red-900',
        icon: 'text-red-600',
    },
    info: {
        container: 'border-sky-200 bg-sky-50 text-sky-900',
        icon: 'text-sky-600',
    },
} as const;

function VariantIcon({ variant }: { variant: NonNullable<ToastProps['variant']> }) {
    if (variant === 'success') return <CheckCircle2 className="h-5 w-5" />;
    if (variant === 'error') return <AlertCircle className="h-5 w-5" />;
    return <Info className="h-5 w-5" />;
}

export function Toast({
    title,
    message,
    visible,
    onDismiss,
    duration = 4500,
    variant = 'success',
}: ToastProps) {
    useEffect(() => {
        if (!visible) return;
        const t = setTimeout(onDismiss, duration);
        return () => clearTimeout(t);
    }, [visible, onDismiss, duration]);

    if (!visible) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={clsx(
                'fixed bottom-5 right-5 z-[100] w-[calc(100vw-2.5rem)] max-w-md rounded-xl border px-4 py-3 shadow-elevation-md transition-all duration-200',
                variantStyles[variant].container,
            )}
        >
            <div className="flex items-start gap-3">
                <span className={clsx('mt-0.5 shrink-0', variantStyles[variant].icon)}>
                    <VariantIcon variant={variant} />
                </span>

                <div className="min-w-0 flex-1">
                    {title ? <p className="text-sm font-semibold">{title}</p> : null}
                    <p className={clsx('text-sm', title ? 'mt-0.5' : 'font-medium')}>{message}</p>
                </div>

                <button
                    type="button"
                    onClick={onDismiss}
                    className="inline-flex shrink-0 rounded-md p-1 text-neutral-500 transition-colors hover:bg-black/5 hover:text-neutral-700"
                    aria-label="Cerrar notificación"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
