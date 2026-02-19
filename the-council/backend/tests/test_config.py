"""Tests for config — verifies defaults and model settings."""

import os
import pytest


def test_settings_loads_with_env_var(monkeypatch):
    """Settings should load when ANTHROPIC_API_KEY is set."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-fake")

    # Clear the lru_cache so we get a fresh Settings instance
    from app.config import get_settings
    get_settings.cache_clear()

    settings = get_settings()
    assert settings.anthropic_api_key == "sk-test-fake"
    assert "sqlite" in settings.database_url
    assert settings.max_debate_rounds == 3
    assert settings.max_agents_per_debate == 5

    # Clean up
    get_settings.cache_clear()


def test_model_defaults(monkeypatch):
    """Default model tiers should be set correctly."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-fake")

    from app.config import get_settings
    get_settings.cache_clear()

    settings = get_settings()
    assert "haiku" in settings.model_router
    assert "sonnet" in settings.model_chat
    assert "opus" in settings.model_deep

    get_settings.cache_clear()


def test_cors_origins_default_contains_expected(monkeypatch):
    """Default cors_origins should include localhost and the Vercel URL."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-fake")

    from app.config import get_settings
    get_settings.cache_clear()

    settings = get_settings()
    origins = settings.cors_origins.split(",")
    assert "http://localhost:3000" in origins
    assert "https://the-council-v2.vercel.app" in origins

    get_settings.cache_clear()


def test_cors_origins_strips_whitespace(monkeypatch):
    """Whitespace around each origin should be stripped at validation time."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-fake")
    monkeypatch.setenv("CORS_ORIGINS", "  http://localhost:3000  ,  https://example.com  ")

    from app.config import get_settings
    get_settings.cache_clear()

    settings = get_settings()
    origins = settings.cors_origins.split(",")
    assert all(o == o.strip() for o in origins), "No origin should have leading/trailing spaces"
    assert "http://localhost:3000" in origins
    assert "https://example.com" in origins

    get_settings.cache_clear()


def test_cors_origins_preserves_all_entries(monkeypatch):
    """All comma-separated origins should be preserved after normalization."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-fake")
    monkeypatch.setenv(
        "CORS_ORIGINS",
        "http://localhost:3000,https://staging.example.com,https://prod.example.com",
    )

    from app.config import get_settings
    get_settings.cache_clear()

    settings = get_settings()
    origins = settings.cors_origins.split(",")
    assert len(origins) == 3
    assert "http://localhost:3000" in origins
    assert "https://staging.example.com" in origins
    assert "https://prod.example.com" in origins

    get_settings.cache_clear()
