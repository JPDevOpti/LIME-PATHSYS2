'use client';

import { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

export type FormErrorType = 'validation' | 'submit';

export interface FormErrorItem {
    field: string;
    message: string;
}

export interface FormErrorAlertProps {
    /** Mensaje de error (para submit) */
    message: string;
    /** Tipo: validación o envío */
    type?: FormErrorType;
    /** Campo que falló (opcional, para un solo error) */
    field?: string;
    /** Lista de errores de validación (muestra todos los campos) */
    errors?: FormErrorItem[];
}

const typeLabels: Record<FormErrorType, string> = {
    validation: 'Error de validación',
    submit: 'Error al guardar'
};

export function FormErrorAlert({ message, type = 'validation', field, errors }: FormErrorAlertProps) {
    const ref = useRef<HTMLDivElement>(null);
    const showList = type === 'validation' && errors && errors.length > 0;

    useEffect(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [message, errors]);

    return (
        <div
            ref={ref}
            className="flex gap-3 p-4 rounded-lg border border-red-200 bg-red-50 animate-zoom-in"
            role="alert"
        >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 min-w-0">
                <p className="text-sm font-medium text-red-800">{typeLabels[type]}</p>
                {showList ? (
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-0.5">
                        {errors.map((e, i) => (
                            <li key={i}><span className="font-medium">{e.field}:</span> {e.message}</li>
                        ))}
                    </ul>
                ) : (
                    <>
                        {field && <p className="text-xs font-medium text-red-700">Campo: {field}</p>}
                        <p className="text-sm text-red-700">{message}</p>
                    </>
                )}
            </div>
        </div>
    );
}
