import uvicorn
import os

from app.config import settings

if __name__ == "__main__":
    reload_enabled = os.getenv("BACKEND_RELOAD", "0").lower() in {"1", "true", "yes", "on"}
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=reload_enabled,
    )
