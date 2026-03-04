from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, HTTPBearer
from typing import Optional
from app.security import verify_token, verify_token_payload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
http_bearer = HTTPBearer(auto_error=False)

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    subject = verify_token(token)
    if subject is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return subject

def get_current_user(
    user_id: str = Depends(get_current_user_id),
) -> dict:
    from app.database import get_db
    from app.modules.auth.repository import AuthRepository
    from app.modules.auth.service import AuthService
    
    db = get_db()
    service = AuthService(AuthRepository(db))
    try:
        return service.get_user_public_by_id(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found")

def get_current_user_id_optional(
    credentials: Optional[object] = Depends(http_bearer),
) -> Optional[str]:
    if not credentials or not hasattr(credentials, "credentials"):
        return None
    return verify_token(credentials.credentials)
