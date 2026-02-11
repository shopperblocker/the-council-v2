"""
The Council: Multi-Agent AI Advisory Platform

FastAPI backend with SSE streaming, PostgreSQL, and direct Anthropic SDK.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db, close_db
from app.routes.war_room import router as war_room_router
from app.routes.private_desk import router as private_desk_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: create tables
    await init_db()
    print("[OK] Database initialized")
    print("The Council is ready.")
    yield
    # Shutdown: close connections
    await close_db()


app = FastAPI(
    title="The Council",
    description="Multi-Agent AI Advisory Platform",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(war_room_router)
app.include_router(private_desk_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "the-council", "version": "2.0.0"}
