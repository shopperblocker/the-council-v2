"""
diagnose.py — Railway Database Diagnostic Tool

Connects to a PostgreSQL database and checks whether The Council's
required tables exist and have the expected columns.

Usage:
    # From Railway shell or locally with public DB URL:
    python diagnose.py postgresql+asyncpg://user:pass@host:5432/dbname

    # Or set DATABASE_URL env var:
    DATABASE_URL=postgresql+asyncpg://... python diagnose.py

    # Also accepts plain postgresql:// URLs (auto-converts to +asyncpg)
"""

import sys
import asyncio
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import create_async_engine


EXPECTED_TABLES = {
    "sessions": ["id", "mode", "topic", "user_context", "agents", "created_at"],
    "messages": ["id", "session_id", "sender", "sender_type", "content", "created_at"],
    "shared_memory": ["id", "category", "key", "value", "source_agent", "confidence", "session_id", "created_at"],
    "insights": ["id", "agent_name", "insight_type", "title", "content", "priority", "context_ref", "viewed", "acted_on", "created_at"],
}


def fix_url(url: str) -> str:
    """Convert postgresql:// to postgresql+asyncpg:// if needed."""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


async def diagnose(database_url: str):
    url = fix_url(database_url)
    print(f"\n{'='*60}")
    print("  The Council — Database Diagnostic")
    print(f"{'='*60}")
    print(f"\nConnecting to: {url.split('@')[-1] if '@' in url else url}")

    is_sqlite = url.startswith("sqlite")

    try:
        engine = create_async_engine(url, echo=False)
        async with engine.connect() as conn:
            db_type = "SQLite" if is_sqlite else "PostgreSQL"
            print(f"[OK] Connected to {db_type}\n")

            # Check server version
            if not is_sqlite:
                result = await conn.execute(text("SELECT version()"))
                version = result.scalar()
                print(f"Server: {version.split(',')[0] if version else 'unknown'}\n")

            # Get existing tables
            if is_sqlite:
                result = await conn.execute(text(
                    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
                ))
            else:
                result = await conn.execute(text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public' ORDER BY table_name"
                ))
            existing_tables = {row[0] for row in result.fetchall()}
            print(f"Tables found: {len(existing_tables)}")
            for t in sorted(existing_tables):
                print(f"  - {t}")

            if not existing_tables:
                print("\n[!!] NO TABLES EXIST — database is empty!")
                print("     Tables were never created. The app will crash on any query.")
                print("     Fix: deploy with the updated startup guard, or run create_tables.py")

            # Check each expected table
            print(f"\n--- Expected Tables ({len(EXPECTED_TABLES)}) ---")
            missing_tables = []
            for table_name, expected_cols in EXPECTED_TABLES.items():
                if table_name in existing_tables:
                    # Check columns
                    if is_sqlite:
                        result = await conn.execute(text(f'PRAGMA table_info("{table_name}")'))
                        actual_cols = [row[1] for row in result.fetchall()]
                    else:
                        result = await conn.execute(text(
                            "SELECT column_name FROM information_schema.columns "
                            "WHERE table_schema = 'public' AND table_name = :t "
                            "ORDER BY ordinal_position"
                        ), {"t": table_name})
                        actual_cols = [row[0] for row in result.fetchall()]
                    missing_cols = [c for c in expected_cols if c not in actual_cols]

                    if missing_cols:
                        print(f"  [WARN] {table_name}: exists but missing columns: {missing_cols}")
                    else:
                        # Row count
                        result = await conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
                        count = result.scalar()
                        print(f"  [OK]   {table_name} ({count} rows)")
                else:
                    missing_tables.append(table_name)
                    print(f"  [MISS] {table_name}: DOES NOT EXIST")

            # Summary
            print(f"\n{'='*60}")
            if missing_tables:
                print(f"  RESULT: {len(missing_tables)} missing table(s): {', '.join(missing_tables)}")
                print("  ACTION: Deploy with updated code or run create_tables.py")
            else:
                print("  RESULT: All tables present and healthy")
            print(f"{'='*60}\n")

        await engine.dispose()

    except Exception as e:
        print(f"\n[FAIL] Could not connect: {e}")
        print("\nCommon causes:")
        print("  - postgres.railway.internal only works inside Railway")
        print("  - Use the public URL from Railway dashboard for local access")
        print("  - Check that the database service is running")
        sys.exit(1)


if __name__ == "__main__":
    import os
    url = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("DATABASE_URL", "")
    if not url:
        print("Usage: python diagnose.py <DATABASE_URL>")
        print("   or: DATABASE_URL=... python diagnose.py")
        sys.exit(1)
    asyncio.run(diagnose(url))
