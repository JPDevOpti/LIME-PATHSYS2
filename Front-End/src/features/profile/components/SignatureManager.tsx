'use client';

import { useState, useRef, useEffect } from 'react';
import { BaseCard } from '@/shared/components/base';
import { Upload, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { apiClient } from '@/shared/api/client';

interface SignatureManagerProps {
    /** URL o base64 data URI de la firma actual */
    currentUrl?: string | null;
    /**
     * Modo controlled: el padre recibe el base64 y decide cuándo guardarlo.
     * Si no se provee, el componente guarda automáticamente vía PUT /api/v1/auth/profile.
     */
    onChange?: (base64: string | null) => void;
    /**
     * Callback llamado después de que el auto-save fue exitoso.
     * Recibe el base64 guardado (o null si se eliminó).
     */
    onSaved?: (base64: string | null) => void;
    /** ID de usuario destino. Si se provee y no hay onChange, guarda en /api/v1/users/{userId}. */
    userId?: string;
}

function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function SignatureManager({ currentUrl = '', onChange, onSaved, userId }: SignatureManagerProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        currentUrl && currentUrl.trim() !== '' ? currentUrl : null
    );

    // Sincronizar estado interno si el prop cambia desde afuera (ej. carga en segundo plano)
    useEffect(() => {
        if (currentUrl && currentUrl.trim() !== '') {
            setPreviewUrl(currentUrl);
        } else if (currentUrl === null || currentUrl === '') {
            setPreviewUrl(null);
        }
    }, [currentUrl]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedSuccess, setSavedSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const autoSave = !onChange;

    const persistSignature = async (base64: string | null) => {
        const endpoint = userId ? `/api/v1/users/${userId}` : '/api/v1/auth/profile';
        await apiClient.put(endpoint, { signature: base64 ?? '' });
    };

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Solo se permiten archivos de imagen (JPG, PNG, WEBP, GIF)');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('El archivo no puede superar los 5MB');
            return;
        }
        setError(null);
        setIsUploading(true);
        try {
            const base64 = await readFileAsDataURL(file);
            setPreviewUrl(base64);
            if (onChange) {
                onChange(base64);
            } else {
                await persistSignature(base64);
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
                onSaved?.(base64);
            }
        } catch {
            setError('No se pudo procesar la imagen. Intenta de nuevo.');
            setPreviewUrl(null);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = async () => {
        setError(null);
        setIsUploading(true);
        try {
            if (onChange) {
                onChange(null);
            } else {
                await persistSignature(null);
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
                onSaved?.(null);
            }
            setPreviewUrl(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch {
            setError('No se pudo eliminar la firma. Intenta de nuevo.');
        } finally {
            setIsUploading(false);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer?.files;
        if (files?.length && files[0]) handleFile(files[0]);
    };

    return (
        <BaseCard title="Firma Digital">
            <p className="text-sm text-neutral-500 mb-4">
                Sube tu imagen de firma para usarla en reportes médicos y documentos oficiales
            </p>

            {error && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            {savedSuccess && (
                <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                    Firma guardada correctamente
                </div>
            )}

            <div
                className={clsx(
                    'border border-dashed rounded-xl bg-neutral-50 p-6 md:p-8 transition-colors',
                    isDragOver ? 'border-blue-500 bg-blue-50/50' : 'border-neutral-300 hover:border-blue-500'
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDrop}
            >
                {previewUrl ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="bg-white border-2 border-neutral-200 rounded-lg p-4 shadow-md min-h-[120px] min-w-[200px] flex items-center justify-center overflow-hidden">
                                <img
                                    src={previewUrl}
                                    alt="Firma digital"
                                    className="max-h-32 max-w-full object-contain"
                                />
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-neutral-900 mb-1">Firma Digital Cargada</p>
                            <p className="text-xs text-neutral-500 mb-3">
                                {autoSave
                                    ? 'Tu firma está lista para usar en reportes médicos'
                                    : 'Guarda el formulario para aplicar los cambios'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <label className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50">
                                <Upload className="w-4 h-4" />
                                Cambiar
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                    disabled={isUploading}
                                    onChange={(e) => {
                                        const files = e.target.files;
                                        if (files?.length && files[0]) handleFile(files[0]);
                                    }}
                                />
                            </label>
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-red-600 text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
                                onClick={handleRemove}
                                disabled={isUploading}
                            >
                                <Trash2 className="w-4 h-4" />
                                {isUploading ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <Upload className="w-10 h-10" />
                        </div>
                        <h4 className="mb-2 font-semibold text-neutral-800">Subir Firma Digital</h4>
                        <p className="mb-4 text-sm text-neutral-600">
                            Arrastra y suelta tu imagen de firma aquí o haz clic para seleccionar
                        </p>
                        <label className={clsx(
                            'inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors shadow-sm',
                            isUploading && 'opacity-50 pointer-events-none'
                        )}>
                            <Upload className="w-4 h-4" />
                            {isUploading ? 'Procesando...' : 'Seleccionar archivo'}
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                disabled={isUploading}
                                onChange={(e) => {
                                    const files = e.target.files;
                                    if (files?.length && files[0]) handleFile(files[0]);
                                }}
                            />
                        </label>
                        <p className="mt-3 text-xs text-neutral-500">
                            Formatos: JPG, JPEG, PNG, GIF, WEBP · Máximo 5MB
                        </p>
                    </div>
                )}
            </div>
        </BaseCard>
    );
}
