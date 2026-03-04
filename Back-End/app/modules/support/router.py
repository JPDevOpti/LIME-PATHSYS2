from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_db
from app.modules.auth.dependencies import get_current_user
from .schemas import (
    SupportTicketCreate, 
    SupportTicketResponse, 
    TicketListResponse, 
    ChangeStatusRequest,
    TicketCommentCreate
)
from .service import SupportService

router = APIRouter()

def get_support_service(db = Depends(get_db)) -> SupportService:
    return SupportService(db)

@router.get("/", response_model=TicketListResponse)
def get_tickets(
    status: Optional[str] = None,
    category: Optional[str] = None,
    search_text: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = "ticket_date",
    sort_order: str = "desc",
    service: SupportService = Depends(get_support_service)
):
    data, total = service.get_tickets(
        status=status,
        category=category,
        search_text=search_text,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return {"data": data, "total": total}

@router.get("/{code}", response_model=SupportTicketResponse)
def get_ticket(
    code: str, 
    service: SupportService = Depends(get_support_service)
):
    ticket = service.get_ticket(code)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    return ticket

@router.post("/", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: SupportTicketCreate,
    current_user: dict = Depends(get_current_user),
    service: SupportService = Depends(get_support_service)
):
    user_id = str(current_user.get("id") or current_user.get("_id"))
    user_name = current_user.get("full_name") or current_user.get("name") or "Usuario"
    return service.create_ticket(payload, user_id, user_name)

@router.patch("/{code}/status", response_model=SupportTicketResponse)
def update_ticket_status(
    code: str,
    payload: ChangeStatusRequest,
    service: SupportService = Depends(get_support_service)
):
    ticket = service.update_status(code, payload.status)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    return ticket

@router.post("/{code}/comments", response_model=SupportTicketResponse)
def add_comment(
    code: str,
    payload: TicketCommentCreate,
    current_user: dict = Depends(get_current_user),
    service: SupportService = Depends(get_support_service)
):
    user_id = str(current_user.get("id") or current_user.get("_id"))
    user_name = current_user.get("full_name") or current_user.get("name") or "Usuario"
    # Aquí podríamos verificar si el rol es 'admin' para el campo is_admin
    is_admin = current_user.get("role") in ["administrator", "administrador", "admin"]
    
    ticket = service.add_comment(code, payload.content, user_id, user_name, is_admin)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    return ticket

@router.delete("/{code}")
def delete_ticket(
    code: str, 
    service: SupportService = Depends(get_support_service)
):
    if not service.delete_ticket(code):
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    return {"status": "success", "message": "Ticket eliminado correctamente"}
