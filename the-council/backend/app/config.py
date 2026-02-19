"""
Configuration: Environment-based settings for The Council.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    # API
    anthropic_api_key: str

    # Database — SQLite for local dev, PostgreSQL for production
    database_url: str = "sqlite+aiosqlite:///./council.db"

    # CORS — comma-separated list of allowed origins
    cors_origins: str = "http://localhost:3000,https://the-council-v2.vercel.app"

    # AI Models — tiered for cost/performance
    model_router: str = "claude-haiku-4-5-20251001"      # Fast routing & classification
    model_chat: str = "claude-sonnet-4-5-20250929"        # Agent conversations
    model_deep: str = "claude-opus-4-6"                   # Deep analysis, synthesis

    # Agent settings
    max_debate_rounds: int = 3
    max_agents_per_debate: int = 5
    default_max_tokens: int = 1024

    @field_validator("cors_origins")
    @classmethod
    def normalize_cors_origins(cls, v: str) -> str:
        """Strip whitespace from each comma-separated origin."""
        return ",".join(o.strip() for o in v.split(",") if o.strip())

    @field_validator("database_url")
    @classmethod
    def fix_database_url(cls, v: str) -> str:
        """Auto-fix DATABASE_URL for async drivers.

        Railway (and Heroku, Render, etc.) provide postgresql:// or
        postgres:// URLs.  SQLAlchemy async needs the +asyncpg dialect.
        """
        # postgres:// is a legacy alias — normalize first
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql://", 1)
        # Add +asyncpg if it's a bare postgresql:// URL
        if v.startswith("postgresql://") and "+asyncpg" not in v:
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "protected_namespaces": ("settings_",),  # Silence model_ field warnings
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
