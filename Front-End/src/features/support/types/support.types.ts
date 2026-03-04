export type TicketCategory = 'bug' | 'feature' | 'question' | 'technical';
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';

export interface TicketComment {
    id: string;
    content: string;
    author_id: string;
    author_name: string;
    is_admin: boolean;
    created_at: string;
}

export interface SupportTicket {
    ticket_code: string;
    title: string;
    category: TicketCategory;
    description: string;
    images?: string[];
    ticket_date: string;
    status: TicketStatus;
    created_by?: string;
    created_by_name?: string;
    comments?: TicketComment[];
}

export interface NewTicketForm {
    title: string;
    category: TicketCategory;
    description: string;
    images?: File[];
}

export interface TicketFilters {
    status: TicketStatus | 'all';
    category: TicketCategory | 'all';
    search: string;
}

export interface TicketSearch {
    status?: TicketStatus;
    category?: TicketCategory;
    created_by?: string;
    search_text?: string;
    date_from?: string;
    date_to?: string;
}
