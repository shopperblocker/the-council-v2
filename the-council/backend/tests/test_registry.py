"""Tests for the agent registry — pure data, no API key needed."""

from app.agents.registry import (
    AGENTS,
    Board,
    get_agent,
    get_all_agents,
    get_board_agents,
    get_agent_names,
    find_specialists,
)


def test_all_12_agents_registered():
    assert len(AGENTS) == 12


def test_get_agent_by_name():
    agent = get_agent("Rockefeller")
    assert agent is not None
    assert agent.display_name == "John D. Rockefeller"
    assert agent.board == Board.WAR_ROOM


def test_get_agent_returns_none_for_unknown():
    assert get_agent("NonExistent") is None


def test_get_all_agents_returns_full_list():
    all_agents = get_all_agents()
    assert len(all_agents) == 12
    names = {a.name for a in all_agents}
    assert "Napoleon" in names
    assert "Feynman" in names


def test_get_board_agents():
    war_room = get_board_agents(Board.WAR_ROOM)
    assert len(war_room) == 4
    assert all(a.board == Board.WAR_ROOM for a in war_room)

    clinic = get_board_agents(Board.CLINIC)
    assert len(clinic) == 3

    academy = get_board_agents(Board.ACADEMY)
    assert len(academy) == 3

    engine = get_board_agents(Board.ENGINE_ROOM)
    assert len(engine) == 2


def test_get_agent_names():
    names = get_agent_names()
    assert isinstance(names, list)
    assert "Marcus_Aurelius" in names
    assert "Steve_Jobs" in names


def test_find_specialists():
    finance_agents = find_specialists("finance")
    assert any(a.name == "Rockefeller" for a in finance_agents)

    philosophy_agents = find_specialists("philosophy")
    names = {a.name for a in philosophy_agents}
    assert "Marcus_Aurelius" in names or "Socrates" in names


def test_find_specialists_no_match():
    assert find_specialists("quantum_computing") == []


def test_every_agent_has_required_fields():
    for name, agent in AGENTS.items():
        assert agent.name == name
        assert agent.display_name, f"{name} missing display_name"
        assert agent.board, f"{name} missing board"
        assert agent.role, f"{name} missing role"
        assert agent.emoji, f"{name} missing emoji"
        assert agent.color.startswith("#"), f"{name} color should be hex"
        assert agent.voice, f"{name} missing voice"
        assert agent.core_belief, f"{name} missing core_belief"
        assert agent.instruction, f"{name} missing instruction"
        assert len(agent.specializations) > 0, f"{name} has no specializations"
        assert 0.0 <= agent.temperature <= 1.0, f"{name} temperature out of range"
