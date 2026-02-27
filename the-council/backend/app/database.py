"""
Database: Async SQLAlchemy 2.0 with SQLite (local) and PostgreSQL (production).

SQLite for local development — zero setup, just works.
PostgreSQL for Railway production — set DATABASE_URL env var.

Includes startup guards: retry connection, create tables, verify schema.
"""

import asyncio
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

logger = logging.getLogger(__name__)


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
REQUIRED_TABLES = {
    "sessions", "messages", "shared_memory", "insights",
    "user_profiles", "financial_accounts", "transactions", "portfolio_positions",
    "plans", "milestones", "study_paths", "study_topics",
    "products", "orders",
}


async def get_db() -> AsyncSession:
    """Dependency: yields a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def wait_for_db(max_retries: int = 10, base_delay: float = 0.5):
    """Wait for the database to become reachable with exponential backoff.

    Railway can start the app container before PostgreSQL is fully ready.
    This prevents a crash-loop by retrying the initial connection.
    10 retries × 0.5s base = up to ~3 minutes total, covers Railway cold-start.
    """
    for attempt in range(1, max_retries + 1):
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("Database reachable (attempt %d)", attempt)
            return
        except Exception as e:
            if attempt == max_retries:
                url = get_settings().database_url
                masked = url[:30] + "..." if len(url) > 30 else url
                logger.critical(
                    "Database unreachable after %d attempts. URL prefix: %s | Error: %s",
                    max_retries, masked, e,
                )
                raise
            delay = base_delay * (2 ** (attempt - 1))  # 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256
            logger.warning("DB not ready (attempt %d/%d): %s", attempt, max_retries, e)
            logger.info("Retrying in %.1fs...", delay)
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
