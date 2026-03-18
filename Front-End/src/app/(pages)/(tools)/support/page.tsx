'use client';

import { useEffect, useState } from 'react';
import { NewTicket, ActualTickets } from '@/features/support/components';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { ticketsService } from '@/features/support/services/tickets.service';
import type { SupportTicket } from '@/features/support/types/support.types';

export default function SupportPage() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(false);
    const { isAdmin } = usePermissions();

    const loadTickets = async () => {
        setLoading(true);
        try {
            const data = await ticketsService.getTickets();
            setTickets(Array.isArray(data) ? data : []);
        } catch {
            setTickets([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, []);

    const onTicketCreated = (ticket: SupportTicket) => {
        setTickets((prev) => [ticket, ...prev]);
    };

    const onStatusChanged = (code: string, newStatus: string) => {
        setTickets((prev) =>
            prev.map((t) => (t.ticket_code === code ? { ...t, status: newStatus as import('@/features/support/types/support.types').TicketStatus } : t))
        );
    };

    const onDeleted = (code: string) => {
        setTickets((prev) => prev.filter((t) => t.ticket_code !== code));
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <NewTicket onTicketCreated={onTicketCreated} />
                </div>
                <div className="lg:col-span-2">
                    <ActualTickets
                        tickets={tickets}
                        isAdmin={isAdmin}
                        onStatusChanged={onStatusChanged}
                        onDeleted={onDeleted}
                        onRefresh={loadTickets}
                    />
                </div>
            </div>
        </div>
    );
}
