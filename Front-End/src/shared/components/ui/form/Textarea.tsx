import { TextareaHTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: string;
    label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, error, label, id, ...props }, ref) => {
        const textareaId = id || props.name;

        return (
            <textarea
                id={textareaId}
                ref={ref}
                className={twMerge(
                    "flex min-h-[80px] w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-lime-brand-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
                    error && "border-red-500 focus:ring-red-500",
                    className
                )}
                {...props}
            />
        );
    }
);

Textarea.displayName = 'Textarea';
