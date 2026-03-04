import { InputHTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, label, id, value, ...props }, ref) => {
        const inputId = id || props.name;

        return (
            <input
                id={inputId}
                ref={ref}
                value={value ?? ''}
                className={twMerge(
                    "flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-lime-brand-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
                    error && "border-red-500 focus:ring-red-500",
                    className
                )}
                {...props}
            />
        );
    }
);

Input.displayName = 'Input';
