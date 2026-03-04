"""Schemas Pydantic para el módulo de soporte (tickets)."""

from typing import Literal

from pydantic import BaseModel


TicketStatus = Literal["open", "in-progress", "resolved", "closed"]
TicketCategory = Literal["bug", "feature", "question", "technical"]


class TicketCommentCreate(BaseModel):
    content: str


class TicketCommentResponse(BaseModel):
    id: str
    content: str
    author_id: str
    author_name: str
    is_admin: bool
    created_at: str


class SupportTicketCreate(BaseModel):
    title: str
    category: TicketCategory
    description: str
    images: list[str] | None = None  # base64 strings


class ChangeStatusRequest(BaseModel):
    status: TicketStatus


class SupportTicketResponse(BaseModel):
    ticket_code: str
    title: str
    category: str
    description: str
    images: list[str] | None = None
    ticket_date: str
    status: str
    created_by: str | None = None
    created_by_name: str | None = None
    comments: list[TicketCommentResponse] | None = None

    model_config = {"from_attributes": True}


class TicketListResponse(BaseModel):
    data: list[SupportTicketResponse]
    total: int
