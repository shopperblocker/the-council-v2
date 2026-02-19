"""
The Council: Multi-Agent AI Advisory Platform

FastAPI backend with SSE streaming, PostgreSQL, and direct Anthropic SDK.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db, close_db, wait_for_db, verify_tables
from app.routes.war_room import router as war_room_router
from app.routes.private_desk import router as private_desk_router

# Track readiness for health check
_ready = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown with full verification."""
    global _ready

    settings = get_settings()
    db_host = settings.database_url.split("@")[-1] if "@" in settings.database_url else "local"
    print(f"[BOOT] Database target: {db_host}")

    # 1. Wait for DB to be reachable (handles Railway cold-start race)
    await wait_for_db()

    # 2. Create all tables (idempotent — no-op if they already exist)
    await init_db()
    print("[OK] Database schema applied")

    # 3. Verify every required table actually exists
    missing = await verify_tables()
    if missing:
        raise RuntimeError(
            f"FATAL: Tables still missing after create_all: {missing}. "
            f"Check that all models are imported in models.py and that "
            f"models.py imports Base from database.py."
        )
    print(f"[OK] All tables verified: sessions, messages, shared_memory, insights")

    # 4. Verify agent registry loads (catches import / config errors)
    from app.agents.registry import get_all_agents
    agents = get_all_agents()
    if not agents:
        raise RuntimeError("FATAL: Agent registry returned 0 agents")
    print(f"[OK] {len(agents)} agents loaded")

    # 5. Mark ready
    _ready = True
    print("The Council is ready.")

    yield

    # Shutdown
    _ready = False
    await close_db()


app = FastAPI(
    title="The Council",
    description="Multi-Agent AI Advisory Platform",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow explicit origins + any Vercel preview/production URL
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(war_room_router)
app.include_router(private_desk_router)


@app.get("/api/health")
async def health_check():
    if not _ready:
        return {"status": "starting", "service": "the-council", "version": "2.0.0"}
    return {"status": "ok", "service": "the-council", "version": "2.0.0"}
