from typing import Optional
from pymongo.database import Database
from .repository import SupportRepository
from .schemas import SupportTicketCreate, TicketStatus, TicketCommentCreate


class SupportService:
    def __init__(self, db: Database):
        self._repo = SupportRepository(db)

    def get_tickets(
        self,
        status: Optional[str] = None,
        category: Optional[str] = None,
        search_text: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "ticket_date",
        sort_order: str = "desc"
    ) -> tuple[list[dict], int]:
        return self._repo.find_many(
            status=status,
            category=category,
            search_text=search_text,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )

    def get_ticket(self, code: str) -> Optional[dict]:
        return self._repo.find_by_code(code)

    def create_ticket(self, data: SupportTicketCreate, user_id: str, user_name: str) -> dict:
        ticket_data = data.model_dump()
        return self._repo.create(ticket_data, user_id, user_name)

    def update_status(self, code: str, status: TicketStatus) -> Optional[dict]:
        return self._repo.update_status(code, status)

    def add_comment(self, code: str, content: str, user_id: str, user_name: str, is_admin: bool) -> Optional[dict]:
        comment_data = {
            "content": content,
            "author_id": user_id,
            "author_name": user_name,
            "is_admin": is_admin
        }
        return self._repo.add_comment(code, comment_data)

    def delete_ticket(self, code: str) -> bool:
        return self._repo.delete(code)
