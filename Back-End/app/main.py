import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from app.database import get_db
from app.modules.auth import auth_router
from app.modules.cases import router as cases_router
from app.modules.entities import entities_router
from app.modules.tests import tests_router
from app.modules.users import users_router
from app.modules.users.router import pathologists_router
from app.modules.users.repository import UsersRepository
from app.modules.diseases import diseases_router
from app.modules.unread_cases import unread_cases_router
from app.modules.support.router import router as support_router
from app.modules.support.repository import SupportRepository
from app.modules.patients import router as patients_router
from app.modules.patients.repository import PatientRepository
from app.modules.dashboard import dashboard_router
from app.modules.statistics import statistics_router
from app.modules.additional_tests.router import router as additional_tests_router
from app.modules.cases.repository import CaseRepository
from app.modules.entities.repository import EntitiesRepository
from app.modules.tests.repository import TestsRepository
from app.modules.unread_cases.repository import UnreadCasesRepository
from app.modules.billing.router import billing_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = get_db()
    UsersRepository(db)._ensure_indexes()
    PatientRepository(db)._ensure_indexes()
    CaseRepository(db)._ensure_indexes()
    EntitiesRepository(db)._ensure_indexes()
    TestsRepository(db)._ensure_indexes()
    UnreadCasesRepository(db)._ensure_indexes()
    SupportRepository(db)._ensure_indexes()
    yield


# Rate limiter (compartido con auth router)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="PathSys API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Security headers middleware ────────────────────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)


# ── CORS ───────────────────────────────────────────────────────────────────────
def _parse_cors_origins(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]


_default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://0.0.0.0:3001",
]

_env_origins = _parse_cors_origins(os.getenv("CORS_ORIGINS"))
origins = list(dict.fromkeys(_default_origins + _env_origins))  # dedup preservando orden

print(f"[PathSys] CORS origins: {origins}", flush=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_private_network=True,
    expose_headers=["Content-Disposition"],
)

app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(pathologists_router, prefix="/api/v1", tags=["pathologists"])
app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
app.include_router(diseases_router, prefix="/api/v1/diseases", tags=["diseases"])
app.include_router(entities_router, prefix="/api/v1/entities", tags=["entities"])
app.include_router(tests_router, prefix="/api/v1/tests", tags=["tests"])
app.include_router(patients_router, prefix="/api/v1/patients", tags=["patients"])
app.include_router(cases_router, prefix="/api/v1/cases", tags=["cases"])
app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(unread_cases_router, prefix="/api/v1/unread-cases", tags=["unread-cases"])
app.include_router(additional_tests_router, prefix="/api/v1/additional-tests", tags=["additional-tests"])
app.include_router(support_router, prefix="/api/v1/support", tags=["support"])
app.include_router(statistics_router, prefix="/api/v1/statistics", tags=["statistics"])
app.include_router(billing_router, prefix="/api/v1/billing", tags=["billing"])


@app.get("/health")
def health():
    return {"status": "ok"}
