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
