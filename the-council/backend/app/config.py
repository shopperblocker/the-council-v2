"""
Configuration: Environment-based settings for The Council.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # API
    anthropic_api_key: str

    # Database
    database_url: str = "postgresql+asyncpg://council:council@localhost:5432/council"

    # CORS
    cors_origins: str = "http://localhost:3000"

    # AI Models — tiered for cost/performance
    model_router: str = "claude-haiku-4-5-20251001"      # Fast routing & classification
    model_chat: str = "claude-sonnet-4-5-20250929"        # Agent conversations
    model_deep: str = "claude-opus-4-6"                   # Deep analysis, synthesis

    # Agent settings
    max_debate_rounds: int = 3
    max_agents_per_debate: int = 5
    default_max_tokens: int = 1024

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
