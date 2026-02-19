"""
Database: Async SQLAlchemy 2.0 with SQLite (local) and PostgreSQL (production).

SQLite for local development — zero setup, just works.
PostgreSQL for Railway production — set DATABASE_URL env var.

Includes startup guards: retry connection, create tables, verify schema.
"""

import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _create_engine():
    url = get_settings().database_url
    is_sqlite = url.startswith("sqlite")

    if is_sqlite:
        return create_async_engine(
            url,
            echo=False,
            connect_args={"timeout": 30},  # Prevent "database is locked" errors
        )
    else:
        return create_async_engine(
            url,
            echo=False,
            pool_size=5,
            max_overflow=10,
        )


engine = _create_engine()
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Expected tables — single source of truth for verification
REQUIRED_TABLES = {"sessions", "messages", "shared_memory", "insights"}


async def get_db() -> AsyncSession:
    """Dependency: yields a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def wait_for_db(max_retries: int = 5, base_delay: float = 1.0):
    """Wait for the database to become reachable with exponential backoff.

    Railway can start the app container before PostgreSQL is fully ready.
    This prevents a crash-loop by retrying the initial connection.
    """
    for attempt in range(1, max_retries + 1):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            print(f"[OK] Database reachable (attempt {attempt})")
            return
        except Exception as e:
            if attempt == max_retries:
                print(f"[FATAL] Database unreachable after {max_retries} attempts: {e}")
                raise
            delay = base_delay * (2 ** (attempt - 1))  # 1s, 2s, 4s, 8s, 16s
            print(f"[WAIT] DB not ready (attempt {attempt}/{max_retries}): {e}")
            print(f"       Retrying in {delay:.0f}s...")
            await asyncio.sleep(delay)


async def init_db():
    """Create all tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def verify_tables() -> list[str]:
    """Verify that all required tables exist. Returns list of missing tables."""
    url = get_settings().database_url
    is_sqlite = url.startswith("sqlite")

    async with engine.connect() as conn:
        if is_sqlite:
            result = await conn.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ))
        else:
            result = await conn.execute(text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public'"
            ))
        existing = {row[0] for row in result.fetchall()}

    missing = REQUIRED_TABLES - existing
    return sorted(missing)


async def close_db():
    """Dispose engine on shutdown."""
    await engine.dispose()
