import uvicorn
import os
import re

from app.config import settings

if __name__ == "__main__":
    uri_safe = re.sub(r"://[^@]+@", "://<credentials>@", settings.mongodb_uri)
    print(f"[PathSys] MongoDB URI : {uri_safe}", flush=True)
    print(f"[PathSys] Database    : {settings.database_name}", flush=True)

    reload_enabled = os.getenv("BACKEND_RELOAD", "0").lower() in {"1", "true", "yes", "on"}
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=reload_enabled,
    )
