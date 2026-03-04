'use client';

import { useRef, useState, useCallback } from 'react';
import { ImagePlus, X, AlertCircle, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPT_TYPES = 'image/png,image/jpeg,image/jpg,image/gif,image/webp';

interface DiagnosisImagesPanelProps {
    value: string[];
    onChange: (urls: string[]) => void;
    disabled?: boolean;
    /** 'full' para área principal (Firmar), 'sidebar' para columna estrecha */
    variant?: 'sidebar' | 'full';
}

function readFilesAsBase64(files: FileList): Promise<{ urls: string[]; rejected: number }> {
    const readers: Promise<string>[] = [];
    let rejected = 0;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_SIZE_BYTES) { rejected++; continue; }
        readers.push(
            new Promise((resolve) => {
                const r = new FileReader();
                r.onload = (ev) => resolve((ev.target?.result as string) || '');
                r.readAsDataURL(file);
            })
        );
    }
    return Promise.all(readers).then((urls) => ({ urls: urls.filter(Boolean), rejected }));
}

export function DiagnosisImagesPanel({ value, onChange, disabled, variant = 'sidebar' }: DiagnosisImagesPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const images = value || [];
    const [sizeError, setSizeError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const processFiles = useCallback(async (files: FileList) => {
        if (disabled) return;
        setSizeError(null);
        const { urls, rejected } = await readFilesAsBase64(files);
        if (rejected > 0) {
            setSizeError(
                rejected === 1
                    ? '1 imagen fue descartada por superar el límite de 5MB.'
                    : `${rejected} imágenes fueron descartadas por superar el límite de 5MB.`
            );
        }
        if (urls.length) onChange([...images, ...urls]);
    }, [disabled, images, onChange]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) processFiles(e.target.files);
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
    };

    const handleRemove = (index: number) => {
        onChange(images.filter((_, i) => i !== index));
        if (lightboxIndex !== null) {
            if (index === lightboxIndex) setLightboxIndex(null);
            else if (index < lightboxIndex) setLightboxIndex(lightboxIndex - 1);
        }
    };

    const isFull = variant === 'full';

    // ── Lightbox ──────────────────────────────────────────────────
    const Lightbox = () => {
        if (lightboxIndex === null) return null;
        const prev = () => setLightboxIndex((i) => (i! > 0 ? i! - 1 : images.length - 1));
        const next = () => setLightboxIndex((i) => (i! < images.length - 1 ? i! + 1 : 0));
        return (
            <div
                className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center"
                onClick={() => setLightboxIndex(null)}
            >
                {/* Close */}
                <button
                    type="button"
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    onClick={() => setLightboxIndex(null)}
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Counter */}
                <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
                    {lightboxIndex + 1} / {images.length}
                </span>

                {/* Prev */}
                {images.length > 1 && (
                    <button
                        type="button"
                        className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                        onClick={(e) => { e.stopPropagation(); prev(); }}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                )}

                {/* Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={images[lightboxIndex]}
                    alt={`Imagen ${lightboxIndex + 1}`}
                    className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />

                {/* Next */}
                {images.length > 1 && (
                    <button
                        type="button"
                        className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                        onClick={(e) => { e.stopPropagation(); next(); }}
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                )}
            </div>
        );
    };

    // ── Drop zone (zona vacía) ─────────────────────────────────────
    const DropZone = () => (
        <div
            className={clsx(
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors px-4 py-8 cursor-pointer text-center',
                isDragging
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-neutral-300 bg-neutral-50/50 hover:border-emerald-400 hover:bg-emerald-50/40',
                disabled && 'pointer-events-none opacity-60'
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            <div className={clsx(
                'rounded-full p-3 mb-3 transition-colors',
                isDragging ? 'bg-emerald-100' : 'bg-neutral-100'
            )}>
                <ImagePlus className={clsx('w-7 h-7', isDragging ? 'text-emerald-600' : 'text-neutral-400')} />
            </div>
            <p className="text-sm font-medium text-neutral-700 mb-0.5">
                {isDragging ? 'Suelta las imágenes aquí' : 'Agregar imágenes'}
            </p>
            <p className="text-xs text-neutral-400">Arrastra o haz clic · PNG, JPG, WEBP, GIF · Máx. 5MB</p>
        </div>
    );

    // ── Grid de imágenes ──────────────────────────────────────────
    const cols = isFull
        ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
        : 'grid-cols-2';

    return (
        <>
            <Lightbox />
            <div className={clsx('flex flex-col gap-3', isFull ? 'w-full' : 'w-full')}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                        Imágenes ({images.length})
                    </p>
                    {!disabled && images.length > 0 && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                            <ImagePlus className="w-3.5 h-3.5" />
                            Agregar
                        </button>
                    )}
                </div>

                {/* Input oculto */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_TYPES}
                    multiple
                    className="hidden"
                    onChange={handleInputChange}
                    disabled={disabled}
                />

                {/* Error banner */}
                {sizeError && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {sizeError}
                    </div>
                )}

                {/* Drop zone vacía */}
                {images.length === 0 && <DropZone />}

                {/* Grid de imágenes */}
                {images.length > 0 && (
                    <div
                        className={clsx('grid gap-2', cols)}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        {images.map((url, i) => (
                            <div key={i} className="relative group aspect-square">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={url}
                                    alt={`Imagen ${i + 1}`}
                                    className="w-full h-full object-cover rounded-xl border border-neutral-200 transition-transform group-hover:scale-[1.02]"
                                />
                                {/* Overlay hover */}
                                <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    {/* Zoom */}
                                    <button
                                        type="button"
                                        onClick={() => setLightboxIndex(i)}
                                        className="w-8 h-8 rounded-full bg-white/90 text-neutral-800 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                                        title="Ver imagen"
                                    >
                                        <ZoomIn className="w-4 h-4" />
                                    </button>
                                    {/* Eliminar */}
                                    {!disabled && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleRemove(i); }}
                                            className="w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
                                            title="Eliminar imagen"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                {/* Badge número */}
                                <span className="absolute bottom-1 left-1 text-[10px] font-semibold bg-black/50 text-white px-1.5 py-0.5 rounded-md leading-none">
                                    {i + 1}
                                </span>
                            </div>
                        ))}

                        {/* Celda "agregar más" dentro del grid */}
                        {!disabled && (
                            <div
                                className={clsx(
                                    'aspect-square rounded-xl border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center cursor-pointer transition-colors hover:border-emerald-400 hover:bg-emerald-50/40',
                                    isDragging && 'border-emerald-400 bg-emerald-50'
                                )}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <ImagePlus className="w-5 h-5 text-neutral-400 mb-1" />
                                <span className="text-[10px] text-neutral-400 font-medium">Agregar</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
