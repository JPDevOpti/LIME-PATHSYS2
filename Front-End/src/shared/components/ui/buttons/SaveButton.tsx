'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { SaveAll, Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface SaveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    text?: string;
    loading?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const SaveButton = forwardRef<HTMLButtonElement, SaveButtonProps>(
    (
        {
            text = 'Guardar',
            loading = false,
            size = 'md',
            type = 'submit',
            className,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        const baseClasses =
            'inline-flex items-center justify-center gap-2 border border-transparent font-medium rounded-lg text-white bg-lime-brand-600 hover:bg-lime-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200';

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
                    <SaveAll className="h-4 w-4" />
                )}
                {children ?? text}
            </button>
        );
    }
);

SaveButton.displayName = 'SaveButton';
