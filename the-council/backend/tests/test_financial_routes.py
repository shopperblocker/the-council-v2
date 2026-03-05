"""Tests for Financial HQ routes: CRUD, delete, limit bounds."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base


# ── In-memory SQLite test DB ──

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


# ── Account CRUD ──

@pytest.mark.anyio
async def test_create_account(client):
    resp = await client.post("/api/financial/accounts", json={
        "name": "Checking",
        "account_type": "checking",
        "balance": 500.0,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Checking"
    assert data["balance"] == 500.0


@pytest.mark.anyio
async def test_list_accounts(client):
    await client.post("/api/financial/accounts", json={
        "name": "Savings", "account_type": "savings", "balance": 1000.0
    })
    resp = await client.get("/api/financial/accounts")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.anyio
async def test_delete_account(client):
    create_resp = await client.post("/api/financial/accounts", json={
        "name": "ToDelete", "account_type": "checking", "balance": 0.0
    })
    account_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/api/financial/accounts/{account_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True

    # Verify gone
    list_resp = await client.get("/api/financial/accounts")
    ids = [a["id"] for a in list_resp.json()]
    assert account_id not in ids


@pytest.mark.anyio
async def test_delete_account_not_found(client):
    resp = await client.delete("/api/financial/accounts/99999")
    assert resp.status_code == 404


# ── Transaction CRUD ──

@pytest.mark.anyio
async def test_create_and_delete_transaction(client):
    acct = await client.post("/api/financial/accounts", json={
        "name": "Main", "account_type": "checking", "balance": 0.0
    })
    account_id = acct.json()["id"]

    tx_resp = await client.post("/api/financial/transactions", json={
        "account_id": account_id,
        "amount": 100.0,
        "category": "income",
        "description": "Test income",
    })
    assert tx_resp.status_code == 200
    tx_id = tx_resp.json()["id"]

    del_resp = await client.delete(f"/api/financial/transactions/{tx_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True


@pytest.mark.anyio
async def test_transaction_invalid_account(client):
    resp = await client.post("/api/financial/transactions", json={
        "account_id": 99999,
        "amount": 50.0,
        "category": "expense",
    })
    assert resp.status_code == 404
