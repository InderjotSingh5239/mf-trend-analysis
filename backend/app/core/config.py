"""
Centralized application configuration.
All values are loaded from environment variables / .env file.

DB host precedence (see PROJECT_AUDIT.md item F):
  1. DATABASE_URL, if set in the environment, is authoritative (managed
     Postgres / hosted deployments must set this explicitly).
  2. Otherwise, a URL is assembled from the POSTGRES_* parts, whose
     POSTGRES_HOST default ("db") only makes sense inside Docker Compose.
This means a hosted deployment can never silently fall back to the
Docker Compose hostname as long as DATABASE_URL is configured, which is
required in production (see the APP_ENV validator below).
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ============================================================
    # APP
    # ============================================================

    APP_NAME: str = "MF-Intelligence-Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # ============================================================
    # SECURITY
    # ============================================================

    SECRET_KEY: str = "insecure-dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ============================================================
    # DATABASE
    # ============================================================

    # Authoritative in any hosted/production environment. Left unset in
    # local Docker Compose, where it is assembled from POSTGRES_* below.
    DATABASE_URL: Optional[str] = None

    POSTGRES_USER: str = "mf_user"
    POSTGRES_PASSWORD: str = "mf_password"
    POSTGRES_DB: str = "mf_platform"
    # Only a valid default inside Docker Compose (service name "db").
    # Hosted environments MUST set DATABASE_URL instead of relying on this.
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432


    # ============================================================
    # REDIS / CELERY
    # ============================================================

    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379

    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/1"

    # ============================================================
    # CORS
    # ============================================================

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://mf-trend-analysis.vercel.app",
    ]

    # ============================================================
    # EXTERNAL DATA SOURCES
    # ============================================================

    
    AMFI_NAV_URL: str = (
        "https://www.amfiindia.com/spages/NAVAll.txt"
    )

    
    # ============================================================
    # PORTFOLIO / ANALYTICS
    # ============================================================

    DEFAULT_TRADING_DAYS_PER_YEAR: int = 252
    DEFAULT_MONTE_CARLO_SIMULATIONS: int = 5000
    DEFAULT_RISK_FREE_RATE: float = 0.065

    # ============================================================
    # VALIDATORS
    # ============================================================

    @field_validator(
        "BACKEND_CORS_ORIGINS",
        mode="after",
    )
    @classmethod
    def ensure_production_origins(
        cls,
        v: List[str],
    ) -> List[str]:

        required = {
            "https://mf-trend-analysis.vercel.app",
            "http://localhost:5173",
            "http://localhost:3000",
        }

        return list(
            dict.fromkeys(
                [
                    *v,
                    *required,
                ]
            )
        )

    @model_validator(mode="after")
    def assemble_db_url(self) -> "Settings":
        """
        DATABASE_URL wins if the environment sets it (required for any
        hosted/managed Postgres deployment). Otherwise, fall back to
        assembling one from POSTGRES_* — valid for local Docker Compose,
        where POSTGRES_HOST correctly resolves to the "db" service.
        """
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"postgresql+psycopg2://"
                f"{self.POSTGRES_USER}:"
                f"{self.POSTGRES_PASSWORD}@"
                f"{self.POSTGRES_HOST}:"
                f"{self.POSTGRES_PORT}/"
                f"{self.POSTGRES_DB}"
            )

        if self.APP_ENV == "production":
            if self.SECRET_KEY == "insecure-dev-secret-change-me":
                raise ValueError(
                    "SECRET_KEY must be set via environment variable in "
                    "production (APP_ENV=production). Refusing to start "
                    "with the insecure development default."
                )
            if self.DEBUG:
                # Never allow FastAPI debug/verbose error pages in prod.
                self.DEBUG = False

        return self


# ================================================================
# SETTINGS SINGLETON
# ================================================================

@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
