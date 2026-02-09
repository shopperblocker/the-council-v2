"""
War Room Routes: API endpoints for multi-agent debates.

All debate responses are streamed via Server-Sent Events (SSE)
for real-time token delivery to the frontend.
"""

from uuid import UUID
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.schemas import DebateRequest, MessageRequest, AgentInfo, SessionOut, MessageOut
from app.services.orchestrator import WarRoomOrchestrator
from app.agents.registry import get_all_agents, get_agent, get_board_agents, Board
from app.models import Session, Message

router = APIRouter(prefix="/api/war-room", tags=["War Room"])


@router.post("/debate")
async def start_debate(
    request: DebateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Start a new War Room debate.

    Returns an SSE stream with agent responses.
    If no agents specified, Haiku auto-selects the best ones.
    """
    orchestrator = WarRoomOrchestrator(db)

    async def event_stream():
        async for event in orchestrator.start_debate(
            question=request.question,
            agent_names=request.agents if request.agents else None,
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
async def send_follow_up(
    session_id: UUID,
    request: MessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Send a follow-up message in an existing debate.

    Optionally @mention a specific agent to direct the question.
    Returns an SSE stream with agent responses.
    """
    orchestrator = WarRoomOrchestrator(db)

    async def event_stream():
        async for event in orchestrator.follow_up(
            session_id=session_id,
            content=request.content,
            mention=request.mention,
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
async def get_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get session details with full message history."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")

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
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
):
    """List recent War Room sessions."""
    result = await db.execute(
        select(Session)
        .where(Session.mode == "war_room")
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


# ── Agent Info Endpoints ──

@router.get("/agents", response_model=list[AgentInfo])
async def list_agents():
    """Get all available agents."""
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


@router.get("/agents/board/{board}")
async def list_board_agents(board: str):
    """Get all agents on a specific board."""
    try:
        board_enum = Board(board)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid board: {board}")

    agents = get_board_agents(board_enum)
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
        for a in agents
    ]
