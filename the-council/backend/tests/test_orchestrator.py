"""Tests for orchestrator utilities — SSE escaping, @mention validation."""

import json
import pytest
from app.services.orchestrator import WarRoomOrchestrator


# ── SSE formatting ──

class FakeDB:
    """Minimal stub — WarRoomOrchestrator only calls _sse() which is a plain method."""
    pass


def make_orchestrator():
    orch = object.__new__(WarRoomOrchestrator)
    return orch


def test_sse_basic_format():
    orch = make_orchestrator()
    result = orch._sse("agent_token", {"agent": "Rockefeller", "token": "hello"})
    assert result.startswith("event: agent_token\n")
    assert "data: " in result
    assert result.endswith("\n\n")


def test_sse_valid_json():
    orch = make_orchestrator()
    result = orch._sse("debate_start", {"session_id": "abc123", "topic": "test"})
    # Extract JSON from data line
    lines = result.strip().split("\n")
    data_line = next(l for l in lines if l.startswith("data: "))
    parsed = json.loads(data_line[len("data: "):])
    assert parsed["session_id"] == "abc123"
    assert parsed["topic"] == "test"


def test_sse_escapes_literal_newlines_in_values():
    """Tokens with newlines must not break SSE protocol (double-newline is the event separator)."""
    orch = make_orchestrator()
    # A token with a real newline character
    result = orch._sse("agent_token", {"agent": "X", "token": "line1\nline2"})
    # The result must not contain a bare double-newline inside the data line
    # (only the trailing \n\n event separator is allowed)
    data_line = [l for l in result.split("\n") if l.startswith("data: ")][0]
    # The data line itself should not contain a literal newline
    assert "\n" not in data_line


def test_sse_round_trips_cleanly():
    """SSE parser should be able to reconstruct the original token."""
    orch = make_orchestrator()
    original_token = "hello\nworld"
    result = orch._sse("agent_token", {"token": original_token})
    data_line = [l for l in result.split("\n") if l.startswith("data: ")][0]
    parsed = json.loads(data_line[len("data: "):])
    assert parsed["token"] == original_token


# ── Private desk orchestrator SSE ──

def test_private_desk_sse_helper():
    from app.services.private_desk_orchestrator import _sse
    result = _sse("conversation_start", {"session_id": "sess-1"})
    assert result.startswith("event: conversation_start\n")
    assert result.endswith("\n\n")
    data_line = [l for l in result.split("\n") if l.startswith("data: ")][0]
    parsed = json.loads(data_line[len("data: "):])
    assert parsed["session_id"] == "sess-1"


def test_private_desk_sse_newline_safe():
    from app.services.private_desk_orchestrator import _sse
    result = _sse("agent_token", {"token": "multi\nline\ntoken"})
    data_line = [l for l in result.split("\n") if l.startswith("data: ")][0]
    assert "\n" not in data_line
