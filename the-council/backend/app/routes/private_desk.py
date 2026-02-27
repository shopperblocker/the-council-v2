"""
Private Desk Routes: 1-on-1 advisory session endpoints.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, Field
from typing import Optional

from app.database import get_db
from app.models import Session, Message
from app.agents.registry import AGENTS
from app.schemas import AgentInfo, MessageOut, SessionOut
from app.services.private_desk_orchestrator import get_private_desk_orchestrator

router = APIRouter(prefix="/api/private-desk", tags=["private-desk"])


# ── Request schemas ──

class ConversationRequest(BaseModel):
    agent: str = Field(..., description="Agent name to talk to")
    message: str = Field(..., min_length=1, max_length=2000)


class FollowUpRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


# ── Endpoints ──

@router.get("/agents")
async def list_agents() -> list[AgentInfo]:
    """Return all agents available for Private Desk sessions."""
    return [
        AgentInfo(
            name=a.name,
            display_name=a.display_name,
            role=a.role,
            emoji=a.emoji,
            color=a.color,
            board=a.board.value,
            voice=a.voice,
            core_belief=a.core_belief,
            specializations=a.specializations,
        )
        for a in AGENTS.values()
    ]


@router.post("/conversation")
async def start_conversation(
    req: ConversationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Start a new 1-on-1 Private Desk session. Returns SSE stream."""
    if req.agent not in AGENTS:
        raise HTTPException(status_code=404, detail=f"Agent '{req.agent}' not found")

    orchestrator = get_private_desk_orchestrator()

    async def generate():
        async for event in orchestrator.start_conversation(
            agent_name=req.agent,
            message=req.message,
            db=db,
        ):
            yield event

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/session/{session_id}/message")
async def continue_conversation(
    session_id: uuid.UUID,
    req: FollowUpRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a follow-up message in an existing Private Desk session. Returns SSE stream."""
    orchestrator = get_private_desk_orchestrator()

    async def generate():
        async for event in orchestrator.continue_conversation(
            session_id=session_id,
            message=req.message,
            db=db,
        ):
            yield event

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/session/{session_id}")
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> SessionOut:
    """Retrieve a full Private Desk session with all messages."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    msg_result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()

    return SessionOut(
        id=session.id,
        mode=session.mode,
        topic=session.topic,
        agents=session.agents,
        created_at=session.created_at,
        messages=[
            MessageOut(
                id=m.id,
                sender=m.sender,
                sender_type=m.sender_type,
                content=m.content,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.get("/sessions")
async def list_sessions(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
) -> list[SessionOut]:
    """List recent Private Desk sessions (most recent first)."""
    result = await db.execute(
        select(Session)
        .where(Session.mode == "private_desk")
        .order_by(desc(Session.created_at))
        .limit(limit)
    )
    sessions = result.scalars().all()

    return [
        SessionOut(
            id=s.id,
            mode=s.mode,
            topic=s.topic,
            agents=s.agents,
            created_at=s.created_at,
            messages=[],
        )
        for s in sessions
    ]
