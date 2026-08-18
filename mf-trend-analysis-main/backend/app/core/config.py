"""
Centralized application configuration.
All values are loaded from environment variables / .env file.
"""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    APP_NAME: str = "MF-Intelligence-Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # --- Security ---
    SECRET_KEY: str = "insecure-dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Database ---
    POSTGRES_USER: str = "mf_user"
    POSTGRES_PASSWORD: str = "mf_password"
    POSTGRES_DB: str = "mf_platform"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str | None = None

    # --- Redis / Celery ---
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/1"

    # --- CORS ---
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # --- External data sources ---
    AMFI_NAV_URL: str = "https://www.amfiindia.com/spages/NAVAll.txt"
    FRED_API_KEY: str | None = None
    NEWSAPI_KEY: str | None = None

    # --- Phase 4: Portfolio Analytics & Calculators ---
    DEFAULT_TRADING_DAYS_PER_YEAR: int = 252
    DEFAULT_MONTE_CARLO_SIMULATIONS: int = 5000
    DEFAULT_RISK_FREE_RATE: float = 0.065

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str | None, info) -> str:
        if v:
            return v
        data = info.data
        return (
            f"postgresql+psycopg2://{data.get('POSTGRES_USER')}:"
            f"{data.get('POSTGRES_PASSWORD')}@{data.get('POSTGRES_HOST')}:"
            f"{data.get('POSTGRES_PORT')}/{data.get('POSTGRES_DB')}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
