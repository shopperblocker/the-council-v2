"""Tests for War Room routes: agents endpoint, session listing with limit bounds."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="function")
async def db_session():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ── Agent endpoints ──

@pytest.mark.anyio
async def test_list_agents_returns_12(client):
    resp = await client.get("/api/war-room/agents")
    assert resp.status_code == 200
    agents = resp.json()
    assert len(agents) == 12


@pytest.mark.anyio
async def test_agent_has_required_fields(client):
    resp = await client.get("/api/war-room/agents")
    agent = resp.json()[0]
    for field in ["name", "display_name", "role", "emoji", "color", "board"]:
        assert field in agent, f"Missing field: {field}"


@pytest.mark.anyio
async def test_list_board_agents(client):
    resp = await client.get("/api/war-room/agents/board/war_room")
    assert resp.status_code == 200
    agents = resp.json()
    assert len(agents) == 4
    assert all(a["board"] == "war_room" for a in agents)


@pytest.mark.anyio
async def test_invalid_board_returns_400(client):
    resp = await client.get("/api/war-room/agents/board/nonexistent")
    assert resp.status_code == 400


# ── Session listing with limit bounds ──

@pytest.mark.anyio
async def test_sessions_default_limit(client):
    resp = await client.get("/api/war-room/sessions")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.anyio
async def test_sessions_limit_too_large_rejected(client):
    resp = await client.get("/api/war-room/sessions?limit=9999")
    assert resp.status_code == 422  # FastAPI validation error


@pytest.mark.anyio
async def test_sessions_limit_zero_rejected(client):
    resp = await client.get("/api/war-room/sessions?limit=0")
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_sessions_limit_100_accepted(client):
    resp = await client.get("/api/war-room/sessions?limit=100")
    assert resp.status_code == 200
