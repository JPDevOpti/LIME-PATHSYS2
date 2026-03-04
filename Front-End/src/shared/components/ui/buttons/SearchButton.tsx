import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface SearchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    text?: string;
    loadingText?: string;
    loading?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

export const SearchButton = forwardRef<HTMLButtonElement, SearchButtonProps>(
    ({
        text = 'Buscar',
        loadingText = 'Buscando...',
        loading = false,
        size = 'md',
        variant = 'primary',
        className,
        disabled,
        ...props
    }, ref) => {
        const baseClasses = 'inline-flex items-center justify-center border font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200';

        const sizeClasses = {
            sm: 'px-3 py-1.5 text-xs gap-1.5',
            md: 'px-4 py-2 text-sm gap-2 h-11',
            lg: 'px-6 py-3 text-base gap-2.5'
        };

        const variantClasses = {
            primary: 'border-transparent text-white bg-lime-brand-600 hover:bg-lime-brand-700 focus:ring-lime-brand-500',
            secondary: 'border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 focus:ring-lime-brand-500',
            success: 'border-transparent text-white bg-green-600 hover:bg-green-700 focus:ring-green-500',
            warning: 'border-transparent text-white bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
            danger: 'border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500'
        };

        return (
            <button
                ref={ref}
                type="button"
                disabled={disabled || loading}
                className={twMerge(
                    baseClasses,
                    sizeClasses[size],
                    variantClasses[variant],
                    className
                )}
                {...props}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Search className="h-4 w-4" />
                )}
                {loading ? loadingText : text}
            </button>
        );
    }
);

SearchButton.displayName = 'SearchButton';
