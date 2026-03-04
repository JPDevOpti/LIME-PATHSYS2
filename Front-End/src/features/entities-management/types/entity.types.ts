export interface Entity {
    id: string;
    name: string;
    code: string;
    observations?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface CreateEntityRequest {
    name: string;
    code: string;
    observations?: string;
    is_active: boolean;
}

export interface UpdateEntityRequest {
    name?: string;
    observations?: string;
    is_active?: boolean;
}
