'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { BaseButton } from '@/shared/components/base';
import { Textarea } from '@/shared/components/ui/form';
import { ticketsService } from '../services/tickets.service';
import type { SupportTicket, TicketComment } from '../types/support.types';

function formatDate(s: string): string {
    if (!s) return 'N/A';
    return new Date(s).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
        open: 'Abierto',
        'in-progress': 'En Progreso',
        resolved: 'Resuelto',
        closed: 'Cerrado',
    };
    return map[status] || status;
}

function getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
        open: 'bg-red-100 text-red-800',
        'in-progress': 'bg-amber-100 text-amber-800',
        resolved: 'bg-green-100 text-green-800',
        closed: 'bg-neutral-100 text-neutral-800',
    };
    return map[status] || 'bg-neutral-100 text-neutral-800';
}

function getCategoryLabel(cat: string): string {
    const map: Record<string, string> = {
        bug: 'Error / Bug',
        feature: 'Nueva característica',
        question: 'Pregunta',
        technical: 'Problema técnico',
    };
    return map[cat] || cat;
}

function getImageSrc(src?: string): string {
    if (!src) return '';
    if (src.startsWith('data:') || src.startsWith('http')) return src;
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    return base ? `${base}${src}` : src;
}

interface TicketDetailModalProps {
    ticket: SupportTicket | null;
    isAdmin?: boolean;
    onClose: () => void;
    onCommentAdded?: () => void;
}

export function TicketDetailModal({
    ticket,
    isAdmin = false,
    onClose,
    onCommentAdded,
}: TicketDetailModalProps) {
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [imageModal, setImageModal] = useState<string | null>(null);

    if (!ticket) return null;

    const comments: TicketComment[] = ticket.comments || [];

    const submitComment = async () => {
        const text = commentText.trim();
        if (!text || !isAdmin || submitting) return;
        setSubmitting(true);
        try {
            await ticketsService.addComment(ticket.ticket_code, text);
            setCommentText('');
            onCommentAdded?.();
        } catch {
            // Error handling
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 top-16 z-[9999] flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4"
                onClick={onClose}
            >
                <div
                    className="relative max-h-[85vh] w-full max-w-4xl overflow-y-auto overflow-x-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
                        <h3 className="text-xl font-semibold text-neutral-900">{ticket.title}</h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-neutral-400 hover:text-neutral-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            <div className="space-y-6 md:col-span-2">
                                <div className="grid grid-cols-2 gap-4 rounded-xl bg-neutral-50 p-4">
                                    <div>
                                        <p className="text-sm text-neutral-500">Código del Ticket</p>
                                        <p className="font-medium text-neutral-900">{ticket.ticket_code}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-neutral-500">Estado</p>
                                        <span
                                            className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(ticket.status)}`}
                                        >
                                            {getStatusLabel(ticket.status)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-neutral-500">Categoría</p>
                                        <p className="font-medium text-neutral-900">
                                            {getCategoryLabel(ticket.category)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-neutral-500">Fecha de Creación</p>
                                        <p className="font-medium text-neutral-900">
                                            {formatDate(ticket.ticket_date)}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-sm text-neutral-500">Creado por</p>
                                        <p className="font-medium text-neutral-900">
                                            {ticket.created_by_name || 'Sin información'}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-xl bg-neutral-50 p-4">
                                    <h5 className="mb-3 text-sm font-medium text-neutral-700">Descripción</h5>
                                    <div className="rounded-lg border border-neutral-200 bg-white p-3">
                                        <p className="whitespace-pre-wrap text-sm text-neutral-800">
                                            {ticket.description}
                                        </p>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                                        <h5 className="mb-3 text-sm font-medium text-neutral-700">
                                            Responder como administrador
                                        </h5>
                                        <Textarea
                                            placeholder="Escribe tu respuesta..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            rows={3}
                                            className="mb-3"
                                        />
                                        <BaseButton
                                            variant="primary"
                                            size="sm"
                                            onClick={submitComment}
                                            disabled={!commentText.trim() || submitting}
                                            loading={submitting}
                                        >
                                            Enviar comentario
                                        </BaseButton>
                                    </div>
                                )}

                                {comments.length > 0 && (
                                    <div className="space-y-3">
                                        <h5 className="text-sm font-medium text-neutral-700">Comentarios</h5>
                                        <div className="space-y-2">
                                            {comments.map((c) => (
                                                <div
                                                    key={c.id}
                                                    className={`rounded-lg border p-3 ${
                                                        c.is_admin
                                                            ? 'border-lime-brand-200 bg-lime-brand-50/30'
                                                            : 'border-neutral-200 bg-white'
                                                    }`}
                                                >
                                                    <div className="mb-1 flex items-center gap-2 text-xs text-neutral-500">
                                                        <span className="font-medium text-neutral-700">
                                                            {c.author_name}
                                                        </span>
                                                        {c.is_admin && (
                                                            <span className="rounded bg-lime-brand-100 px-1.5 py-0.5 text-lime-brand-800">
                                                                Admin
                                                            </span>
                                                        )}
                                                        <span>{formatDate(c.created_at)}</span>
                                                    </div>
                                                    <p className="whitespace-pre-wrap text-sm text-neutral-800">
                                                        {c.content}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="h-full rounded-xl bg-neutral-50 p-4">
                                    <h5 className="mb-3 text-sm font-medium text-neutral-700">Imágenes</h5>
                                    {ticket.images && ticket.images.length > 0 ? (
                                        <div className="max-h-[500px] space-y-4 overflow-y-auto">
                                            {ticket.images.map((img, i) => (
                                                <div
                                                    key={i}
                                                    className="cursor-pointer"
                                                    onClick={() => setImageModal(getImageSrc(img))}
                                                >
                                                    <img
                                                        src={getImageSrc(img)}
                                                        alt="Imagen del ticket"
                                                        className="h-40 w-full rounded-lg border border-neutral-200 object-cover transition-colors hover:border-lime-brand-300"
                                                    />
                                                </div>
                                            ))}
                                            <p className="text-center text-xs text-neutral-500">
                                                Click para ver en grande
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex h-56 w-full items-center justify-center rounded-lg border border-dashed border-neutral-200 text-xs text-neutral-400">
                                            Sin imágenes adjuntas
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="sticky bottom-0 flex justify-end border-t border-neutral-200 bg-white px-6 py-4">
                        <BaseButton variant="secondary" size="sm" onClick={onClose}>
                            Cerrar
                        </BaseButton>
                    </div>
                </div>
            </div>

            {imageModal && (
                <div
                    className="fixed inset-0 top-0 z-[10000] flex items-center justify-center bg-black/75 p-4"
                    onClick={() => setImageModal(null)}
                >
                    <img
                        src={imageModal}
                        alt="Imagen ampliada"
                        className="max-h-full max-w-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}
