'use client';

import { useState, useRef } from 'react';
import { MessageSquarePlus, Paperclip, X } from 'lucide-react';
import { BaseCard, BaseButton, BaseInput } from '@/shared/components/base';
import { Select, Textarea } from '@/shared/components/ui/form';
import { ClearButton } from '@/shared/components/ui/buttons';
import { ticketsService } from '../services/tickets.service';
import type { NewTicketForm, TicketCategory, SupportTicket } from '../types/support.types';

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
    { value: 'bug', label: 'Error / Bug' },
    { value: 'feature', label: 'Nueva característica' },
    { value: 'question', label: 'Pregunta' },
    { value: 'technical', label: 'Problema técnico' },
];

interface NewTicketProps {
    onTicketCreated: (ticket: SupportTicket) => void;
}

export function NewTicket({ onTicketCreated }: NewTicketProps) {
    const [form, setForm] = useState<NewTicketForm>({
        title: '',
        category: '' as TicketCategory,
        description: '',
        images: [],
    });
    const [previews, setPreviews] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isValid = form.title.trim() && form.category && form.description.trim() && !submitting;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newFiles: File[] = [];
        const newPreviews: string[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const res = ticketsService.validateImage(file);
            if (!res.valid) {
                setError(res.error || 'Archivo inválido');
                continue;
            }
            newFiles.push(file);
            const reader = new FileReader();
            reader.onload = (ev) => ev.target?.result && newPreviews.push(ev.target.result as string);
            reader.readAsDataURL(file);
        }
        setForm((prev) => ({ ...prev, images: [...(prev.images || []), ...newFiles] }));
        setPreviews((prev) => [...prev, ...newPreviews]);
        e.target.value = '';
    };

    const removeImage = (index: number) => {
        setForm((prev) => ({
            ...prev,
            images: prev.images?.filter((_, i) => i !== index) || [],
        }));
        setPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const clearForm = () => {
        setForm({ title: '', category: '' as TicketCategory, description: '', images: [] });
        setPreviews([]);
        setError('');
    };

    const submit = async () => {
        if (!isValid) return;
        setSubmitting(true);
        setError('');
        try {
            const ticket = await ticketsService.createTicket(form);
            onTicketCreated(ticket);
            clearForm();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Error al crear el ticket';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <BaseCard variant="default" padding="none" className="overflow-hidden">
            <div className="border-b border-neutral-200 px-6 py-4">
                <div className="flex items-center gap-2">
                    <MessageSquarePlus className="h-5 w-5 text-lime-brand-600" />
                    <h2 className="text-lg font-semibold text-neutral-900">Nuevo Ticket</h2>
                </div>
                <p className="mt-1 text-sm text-neutral-600">
                    Crea un ticket de soporte para reportar problemas o solicitar ayuda
                </p>
            </div>

            <div className="space-y-4 p-6">
                <BaseInput
                    label="Título del ticket"
                    placeholder="Describe brevemente el problema..."
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    maxLength={100}
                    required
                />

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-neutral-700">Categoría</label>
                    <Select
                        options={CATEGORY_OPTIONS}
                        placeholder="Selecciona una categoría"
                        value={form.category}
                        onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as TicketCategory }))}
                    />
                </div>

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-neutral-700">Descripción</label>
                    <Textarea
                        placeholder="Describe detalladamente el problema, pasos para reproducirlo, comportamiento esperado, etc..."
                        value={form.description}
                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        maxLength={500}
                    />
                </div>

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                        Imágenes adjuntas (opcional)
                    </label>
                    <div
                        className="mt-1 flex justify-center rounded-lg border-2 border-dashed border-neutral-300 px-6 py-5"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="text-center">
                            <button
                                type="button"
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-800"
                            >
                                <Paperclip className="h-4 w-4" />
                                Seleccionar imágenes
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageChange}
                            />
                            <p className="text-xs text-neutral-500">PNG, JPG, GIF, WEBP hasta 5MB</p>
                        </div>
                    </div>
                </div>

                {form.images && form.images.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-neutral-700">Imágenes seleccionadas:</h4>
                        <div className="space-y-2">
                            {form.images.map((img, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        {previews[i] && (
                                            <img
                                                src={previews[i]}
                                                alt="Preview"
                                                className="h-12 w-12 rounded object-cover"
                                            />
                                        )}
                                        <div>
                                            <span className="text-sm text-neutral-700">{img.name}</span>
                                            <span className="block text-xs text-neutral-500">
                                                {(img.size / 1024).toFixed(1)} KB
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i)}
                                        className="text-danger-600 hover:text-danger-800"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && <p className="text-sm font-medium text-danger-600">{error}</p>}

                <div className="flex justify-end gap-3 border-t border-neutral-200 pt-4">
                    <ClearButton text="Limpiar" size="sm" onClick={clearForm} />
                    <BaseButton
                        variant="primary"
                        size="sm"
                        disabled={!isValid}
                        loading={submitting}
                        onClick={submit}
                    >
                        Crear Ticket
                    </BaseButton>
                </div>
            </div>
        </BaseCard>
    );
}
