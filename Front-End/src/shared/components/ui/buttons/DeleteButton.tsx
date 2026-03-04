'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface DeleteButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    text?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const DeleteButton = forwardRef<HTMLButtonElement, DeleteButtonProps>(
    (
        {
            text = 'Borrar',
            size = 'md',
            type = 'button',
            className,
            ...props
        },
        ref
    ) => {
        const baseClasses =
            'inline-flex items-center justify-center gap-2 border border-transparent font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200';

        const sizeClasses = {
            sm: 'px-3 py-1.5 text-xs gap-1.5 h-9',
            md: 'px-4 py-2 text-sm gap-2 h-11',
            lg: 'px-6 py-3 text-base gap-2.5 h-12',
        };

        return (
            <button
                ref={ref}
                type={type}
                className={twMerge(baseClasses, sizeClasses[size], className)}
                {...props}
            >
                <Trash2 className="h-4 w-4" />
                {text}
            </button>
        );
    }
);

DeleteButton.displayName = 'DeleteButton';
