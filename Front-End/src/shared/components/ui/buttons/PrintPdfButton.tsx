'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface PrintPdfButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    text?: string;
    loading?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const PrintPdfButton = forwardRef<HTMLButtonElement, PrintPdfButtonProps>(
    (
        {
            text = 'Imprimir PDF',
            loading = false,
            size = 'md',
            type = 'button',
            className,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        const baseClasses =
            'inline-flex items-center justify-center gap-2 border border-neutral-300 font-medium rounded-lg text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200';

        const sizeClasses = {
            sm: 'px-3 py-1.5 text-xs gap-1.5 h-9',
            md: 'px-4 py-2 text-sm gap-2 h-11',
            lg: 'px-6 py-3 text-base gap-2.5 h-12',
        };

        return (
            <button
                ref={ref}
                type={type}
                disabled={disabled || loading}
                className={twMerge(baseClasses, sizeClasses[size], className)}
                {...props}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Printer className="h-4 w-4" />
                )}
                {children ?? text}
            </button>
        );
    }
);

PrintPdfButton.displayName = 'PrintPdfButton';
