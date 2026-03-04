import { ButtonHTMLAttributes, forwardRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface ClearButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    text?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const ClearButton = forwardRef<HTMLButtonElement, ClearButtonProps>(
    (
        {
            text = 'Limpiar',
            size = 'md',
            className,
            ...props
        },
        ref
    ) => {
        const baseClasses =
            'inline-flex items-center justify-center gap-2 border border-neutral-300 font-medium rounded-lg text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200';

        const sizeClasses = {
            sm: 'px-3 py-1.5 text-xs gap-1.5 h-9',
            md: 'px-4 py-2 text-sm gap-2 h-11',
            lg: 'px-6 py-3 text-base gap-2.5 h-12',
        };

        return (
            <button
                ref={ref}
                type="button"
                className={twMerge(baseClasses, sizeClasses[size], className)}
                {...props}
            >
                <RotateCcw className="h-4 w-4" />
                {text}
            </button>
        );
    }
);

ClearButton.displayName = 'ClearButton';
