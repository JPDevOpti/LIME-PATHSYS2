import type { SupportTicket, NewTicketForm, TicketSearch, TicketStatus } from '../types/support.types';
import { apiClient } from '@/shared/api/client';

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export const ticketsService = {
    async getTickets(
        skip = 0,
        limit = 20,
        sortBy = 'ticket_date',
        sortOrder = 'desc'
    ): Promise<SupportTicket[]> {
        const response = await apiClient.get<{ data: SupportTicket[]; total: number }>('/api/v1/support/', {
            skip,
            limit,
            sort_by: sortBy,
            sort_order: sortOrder
        });
        return response.data;
    },

    async getTicketByCode(code: string): Promise<SupportTicket> {
        return await apiClient.get<SupportTicket>(`/api/v1/support/${code}`);
    },

    async createTicket(form: NewTicketForm): Promise<SupportTicket> {
        const images: string[] = [];
        if (form.images?.length) {
            for (const f of form.images) {
                images.push(await fileToDataUrl(f));
            }
        }

        return await apiClient.post<SupportTicket>('/api/v1/support/', {
            title: form.title,
            category: form.category,
            description: form.description,
            images,
        });
    },

    async changeStatus(code: string, status: TicketStatus): Promise<SupportTicket> {
        return await apiClient.patch<SupportTicket>(`/api/v1/support/${code}/status`, {
            status
        });
    },

    async deleteTicket(code: string): Promise<void> {
        await apiClient.delete(`/api/v1/support/${code}`);
    },

    async searchTickets(
        filters: TicketSearch,
        skip = 0,
        limit = 20,
        sortBy = 'ticket_date',
        sortOrder = 'desc'
    ): Promise<SupportTicket[]> {
        const response = await apiClient.get<{ data: SupportTicket[]; total: number }>('/api/v1/support/', {
            status: filters.status,
            category: filters.category,
            search_text: filters.search_text,
            skip,
            limit,
            sort_by: sortBy,
            sort_order: sortOrder
        });
        return response.data;
    },

    async addComment(ticketCode: string, content: string): Promise<SupportTicket> {
        return await apiClient.post<SupportTicket>(`/api/v1/support/${ticketCode}/comments`, {
            content
        });
    },

    validateImage(file: File): { valid: boolean; error?: string } {
        if (!file.type.startsWith('image/')) return { valid: false, error: 'El archivo debe ser una imagen' };
        if (file.size > 5 * 1024 * 1024) return { valid: false, error: 'La imagen no puede superar 5MB' };
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            return { valid: false, error: 'Formato no permitido. Use: JPG, PNG, GIF, WEBP' };
        }
        return { valid: true };
    },
};
