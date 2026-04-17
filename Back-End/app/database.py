import os

from pymongo import MongoClient
from pymongo.database import Database

from app.config import settings

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        uri = settings.mongodb_uri.strip().strip('"').strip("'")
        # Atlas: más tiempo de elección de servidor; local: respuesta rápida.
        default_ms = "20000" if "mongodb+srv" in uri else "5000"
        timeout_ms = int(os.environ.get("MONGODB_SERVER_SELECTION_TIMEOUT_MS", default_ms))
        _client = MongoClient(
            uri,
            serverSelectionTimeoutMS=timeout_ms,
            appname="pathsys-api",
        )
    return _client


def get_db() -> Database:
    return get_client()[settings.database_name]
