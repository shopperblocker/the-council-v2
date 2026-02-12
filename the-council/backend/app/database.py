"""
Database: Async SQLAlchemy 2.0 with SQLite (local) and PostgreSQL (production).

SQLite for local development — zero setup, just works.
PostgreSQL for Railway production — set DATABASE_URL env var.
"""

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


async def get_db() -> AsyncSession:
    """Dependency: yields a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Create all tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Dispose engine on shutdown."""
    await engine.dispose()
