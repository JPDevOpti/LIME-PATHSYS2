import { ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface FormFieldProps {
    /** The content of the label */
    label?: ReactNode;
    /** Error message to display (if any) */
    error?: ReactNode;
    /** Helper text or hint to display below the input */
    hint?: ReactNode;
    /** The ID of the input field this label is for */
    htmlFor?: string;
    /** Whether the field is required (adds a red asterisk) */
    required?: boolean;
    /** Additional classes for the wrapper */
    className?: string;
    /** The input component itself */
    children: ReactNode;
}

export function FormField({
    label,
    error,
    hint,
    htmlFor,
    required,
    className,
    children,
}: FormFieldProps) {
    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            {label && (
                <label
                    htmlFor={htmlFor}
                    className="flex text-sm font-medium text-neutral-700"
                >
                    {label}
                    {required && <span className="ml-1 text-red-500">*</span>}
                </label>
            )}

            <div className="relative">
                {children}
            </div>

            {error ? (
                <p className="text-xs font-medium text-red-600 mt-1 animate-in slide-in-from-top-1 fade-in-0">
                    {error}
                </p>
            ) : hint ? (
                <p className="text-xs text-neutral-500 mt-1">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

// Optional: specialized components if they want atomic control
export function FormLabel({ children, htmlFor, className, required }: { children: ReactNode, htmlFor?: string, className?: string, required?: boolean }) {
    return (
        <label htmlFor={htmlFor} className={cn("block text-sm font-medium text-neutral-700 mb-1.5", className)}>
            {children}
            {required && <span className="ml-1 text-red-500">*</span>}
        </label>
    )
}

export function FormMessage({ children, error, className }: { children?: ReactNode, error?: boolean, className?: string }) {
    if (!children) return null;
    return (
        <p className={cn("text-xs mt-1", error ? "text-red-600 font-medium" : "text-neutral-500", className)}>
            {children}
        </p>
    )
}
