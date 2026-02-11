"""
Private Desk Routes: API endpoints for 1-on-1 advisory conversations.

All conversations are streamed via Server-Sent Events (SSE)
for real-time token delivery to the frontend.
"""

from uuid import UUID
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.schemas import PrivateDeskRequest, MessageRequest, AgentInfo, SessionOut, MessageOut
from app.services.private_desk_orchestrator import PrivateDeskOrchestrator
from app.agents.registry import get_all_agents
from app.models import Session, Message

router = APIRouter(prefix="/api/private-desk", tags=["Private Desk"])


@router.post("/conversation")
async def start_private_conversation(
    request: PrivateDeskRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Start a new Private Desk 1-on-1 conversation.

    Returns an SSE stream with agent response.
    """
    orchestrator = PrivateDeskOrchestrator(db)

    async def event_stream():
        async for event in orchestrator.start_conversation(
            agent_name=request.agent,
            user_message=request.message,
        ):
            yield event

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/session/{session_id}/message")
async def send_private_message(
    session_id: UUID,
    request: MessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message in an existing Private Desk conversation.

    Returns an SSE stream with agent response.
    """
    orchestrator = PrivateDeskOrchestrator(db)

    async def event_stream():
        async for event in orchestrator.continue_conversation(
            session_id=session_id,
            user_message=request.content,
        ):
            yield event

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/session/{session_id}", response_model=SessionOut)
async def get_private_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get Private Desk session details with full message history."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")

    if session.mode != "private_desk":
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="This is not a Private Desk session")

    msg_result = await db.execute(
        select(Message)
        .where(Message.session_id == session.id)
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
async def list_private_sessions(
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
):
    """List recent Private Desk sessions."""
    result = await db.execute(
        select(Session)
        .where(Session.mode == "private_desk")
        .order_by(Session.created_at.desc())
        .limit(limit)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "topic": s.topic,
            "agents": s.agents,
            "created_at": s.created_at.isoformat(),
        }
        for s in sessions
    ]


# ── Agent Info Endpoints (shared with War Room) ──

@router.get("/agents", response_model=list[AgentInfo])
async def list_agents():
    """Get all available agents for Private Desk."""
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
        for a in get_all_agents()
    ]
