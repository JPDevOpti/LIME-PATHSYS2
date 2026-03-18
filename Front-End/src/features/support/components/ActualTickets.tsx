'use client';

import { useState, useEffect } from 'react';
import { ListTodo, ChevronRight, Trash2 } from 'lucide-react';
import { BaseCard } from '@/shared/components/base';
import { BaseButton } from '@/shared/components/base';
import { Input, Select } from '@/shared/components/ui/form';
import { BaseModal } from '@/shared/components/overlay/BaseModal';
import { ClearButton } from '@/shared/components/ui/buttons';
import { ticketsService } from '../services/tickets.service';
import { TicketDetailModal } from './TicketDetailModal';
import type { SupportTicket, TicketFilters, TicketStatus } from '../types/support.types';

const STATUS_OPTIONS = [
    { value: 'all', label: 'Estados' },
    { value: 'open', label: 'Abiertos' },
    { value: 'in-progress', label: 'En progreso' },
    { value: 'resolved', label: 'Resueltos' },
    { value: 'closed', label: 'Cerrados' },
];

const CATEGORY_OPTIONS = [
    { value: 'all', label: 'Categorías' },
    { value: 'bug', label: 'Error / Bug' },
    { value: 'feature', label: 'Nueva característica' },
    { value: 'question', label: 'Pregunta' },
    { value: 'technical', label: 'Problema técnico' },
];

const ADMIN_STATUS_OPTIONS = [
    { value: 'open', label: 'Abierto' },
    { value: 'in-progress', label: 'En Progreso' },
    { value: 'resolved', label: 'Resuelto' },
    { value: 'closed', label: 'Cerrado' },
];

function formatDate(s: string): string {
    return new Date(s).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
        open: 'Abierto',
        'in-progress': 'En progreso',
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

interface ActualTicketsProps {
    tickets: SupportTicket[];
    isAdmin?: boolean;
    onStatusChanged: (code: string, status: string) => void;
    onDeleted: (code: string) => void;
    onRefresh: () => void;
}

export function ActualTickets({
    tickets,
    isAdmin = true,
    onStatusChanged,
    onDeleted,
    onRefresh,
}: ActualTicketsProps) {
    const [filters, setFilters] = useState<TicketFilters>({
        status: 'all',
        category: 'all',
        search: '',
    });
    const [selected, setSelected] = useState<SupportTicket | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    // Mantener selected sincronizado con tickets (p. ej. tras agregar comentario)
    useEffect(() => {
        if (selected && tickets.length) {
            const updated = tickets.find((t) => t.ticket_code === selected.ticket_code);
            if (updated) setSelected(updated);
        }
    }, [tickets, selected?.ticket_code]);

    const filtered = tickets
        .filter((t) => {
            if (filters.status !== 'all' && t.status !== filters.status) return false;
            if (filters.category !== 'all' && t.category !== filters.category) return false;
            if (filters.search.trim()) {
                const q = filters.search.toLowerCase();
                if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
            }
            return true;
        })
        .map((t) => ({
            ...t,
            ticket_code: t.ticket_code ?? '',
            title: t.title ?? '',
            category: t.category ?? '',
            description: t.description ?? '',
            images: t.images ?? [],
            ticket_date: t.ticket_date ?? '',
            status: t.status ?? 'open',
            created_by_name: t.created_by_name ?? '',
        }));

    const changeStatus = async (code: string, newStatus: string) => {
        if (!isAdmin || loading) return;
        try {
            setLoading(true);
            await ticketsService.changeStatus(code, newStatus as TicketStatus);
            onStatusChanged(code, newStatus);
            onRefresh();
        } catch {
            // Error handling
        } finally {
            setLoading(false);
        }
    };

    const doDelete = async () => {
        if (!isAdmin || !confirmDelete || loading) return;
        try {
            setLoading(true);
            await ticketsService.deleteTicket(confirmDelete);
            onDeleted(confirmDelete);
            onRefresh();
            setSelected((s) => (s?.ticket_code === confirmDelete ? null : s));
        } catch {
            // Error handling
        } finally {
            setLoading(false);
            setConfirmDelete(null);
        }
    };

    return (
        <BaseCard variant="default" padding="none" className="overflow-hidden">
            <div className="border-b border-neutral-200 px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <ListTodo className="h-5 w-5 text-lime-brand-600" />
                        <h2 className="text-lg font-semibold text-neutral-900">Tickets Actuales</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="w-48">
                            <Input
                                placeholder="Buscar tickets..."
                                value={filters.search}
                                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                            />
                        </div>
                        <div className="w-40">
                            <Select
                                options={STATUS_OPTIONS}
                                value={filters.status}
                                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as TicketFilters['status'] }))}
                            />
                        </div>
                        <div className="w-44">
                            <Select
                                options={CATEGORY_OPTIONS}
                                value={filters.category}
                                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value as TicketFilters['category'] }))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {filtered.length === 0 ? (
                    <div className="py-8 text-center">
                        <ListTodo className="mx-auto h-12 w-12 text-neutral-300" />
                        <p className="mt-2 text-sm font-medium text-neutral-500">
                            {tickets.length === 0
                                ? 'No hay tickets en el sistema'
                                : 'No se encontraron tickets con los filtros seleccionados'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((ticket) => (
                            <div
                                key={ticket.ticket_code}
                                className="flex cursor-pointer items-start justify-between rounded-lg border border-neutral-200 p-4 transition-shadow hover:shadow-md"
                                onClick={() => setSelected(ticket)}
                            >
                                <div className="flex-1">
                                    <div className="mb-2 flex items-center gap-2">
                                        <h3 className="font-medium text-neutral-900">{ticket.title}</h3>
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(ticket.status)}`}
                                        >
                                            {getStatusLabel(ticket.status)}
                                        </span>
                                        <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-500">
                                            {getCategoryLabel(ticket.category)}
                                        </span>
                                    </div>
                                    {ticket.description && (
                                        <div className="mb-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                                            <p className="whitespace-pre-line text-sm text-neutral-700">
                                                {ticket.description}
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                                        <span>Ticket {ticket.ticket_code}</span>
                                        <span>{ticket.ticket_date ? formatDate(ticket.ticket_date) : ''}</span>
                                        {ticket.created_by_name && (
                                            <span>Creado por: {ticket.created_by_name}</span>
                                        )}
                                        {ticket.images && ticket.images.length > 0 && (
                                            <span>{ticket.images.length} imágenes adjuntas</span>
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <div
                                            className="mt-3 flex items-center gap-2 border-t border-neutral-200 pt-3"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Select
                                                options={ADMIN_STATUS_OPTIONS}
                                                value={ticket.status}
                                                onChange={(e) => changeStatus(ticket.ticket_code, e.target.value)}
                                            />
                                            <BaseButton
                                                variant="danger"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDelete(ticket.ticket_code);
                                                }}
                                                disabled={loading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </BaseButton>
                                        </div>
                                    )}
                                </div>
                                <ChevronRight className="h-5 w-5 text-neutral-400" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <TicketDetailModal
                ticket={selected}
                isAdmin={isAdmin}
                onClose={() => setSelected(null)}
                onCommentAdded={() => selected && onRefresh()}
            />

            <BaseModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                title="Eliminar ticket"
                footer={
                    <>
                        <BaseButton variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>
                            Cancelar
                        </BaseButton>
                        <BaseButton
                            variant="danger"
                            size="sm"
                            onClick={doDelete}
                            loading={loading}
                        >
                            Eliminar
                        </BaseButton>
                    </>
                }
            >
                <p className="text-sm text-neutral-600">
                    ¿Estás seguro de eliminar este ticket? Esta acción no se puede deshacer.
                </p>
            </BaseModal>
        </BaseCard>
    );
}
