import os

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "pathsys"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # JWT
    secret_key: str = os.getenv("SECRET_KEY", "")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    access_token_expire_minutes_remember_me: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES_REMEMBER_ME", "43200")
    )

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if not v:
            env = os.getenv("ENVIRONMENT", "development")
            if env == "development":
                return "dev-secret-key-please-change-in-prod-32-chars-min"
            raise ValueError("SECRET_KEY must be set in production")
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
