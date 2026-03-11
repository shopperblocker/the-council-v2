"""
Insights API: Agent-generated autonomous insights.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.insights import InsightService

router = APIRouter(prefix="/api/insights", tags=["insights"])


def _serialize(i) -> dict:
    return {
        "id": i.id,
        "agent_name": i.agent_name,
        "insight_type": i.insight_type,
        "title": i.title,
        "content": i.content,
        "summary": i.summary,
        "key_points": i.key_points or [],
        "recommended_actions": i.recommended_actions or [],
        "tags": i.tags or [],
        "source_mode": i.source_mode,
        "conversation_id": str(i.conversation_id) if i.conversation_id else None,
        "priority": i.priority,
        "viewed": i.viewed,
        "acted_on": i.acted_on,
        "created_at": i.created_at.isoformat(),
    }


@router.get("")
async def list_unviewed_insights(limit: int = 10, db: AsyncSession = Depends(get_db)):
    """Get unviewed insights."""
    service = InsightService(db)
    return [_serialize(i) for i in await service.list_unviewed(limit=limit)]


@router.get("/unread")
async def get_unread_count(db: AsyncSession = Depends(get_db)):
    """Return the count of unviewed insights — used for dashboard badge."""
    service = InsightService(db)
    insights = await service.list_unviewed(limit=100)
    return {"count": len(insights)}


@router.get("/all")
async def list_all_insights(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Get all insights with pagination."""
    service = InsightService(db)
    return [_serialize(i) for i in await service.list_all(limit=limit, offset=offset)]


class ExtractRequest(BaseModel):
    conversation_id: str


@router.post("/extract")
async def extract_insights(body: ExtractRequest, db: AsyncSession = Depends(get_db)):
    """Manually trigger insight extraction for a full session."""
    import uuid as _uuid
    try:
        _uuid.UUID(body.conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation_id: must be a valid UUID")
    service = InsightService(db)
    insights = await service.extract_from_session(body.conversation_id)
    await db.commit()
    return {"extracted": len(insights), "insights": [_serialize(i) for i in insights]}


@router.patch("/{insight_id}/view")
@router.post("/{insight_id}/viewed")
async def mark_insight_viewed(insight_id: int, db: AsyncSession = Depends(get_db)):
    """Mark an insight as viewed."""
    service = InsightService(db)
    insight = await service.mark_viewed(insight_id)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    await db.commit()
    return {"id": insight.id, "viewed": True}


@router.patch("/{insight_id}/act")
@router.post("/{insight_id}/acted")
async def mark_insight_acted_on(insight_id: int, db: AsyncSession = Depends(get_db)):
    """Mark an insight as acted upon."""
    service = InsightService(db)
    insight = await service.mark_acted_on(insight_id)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    await db.commit()
    return {"id": insight.id, "acted_on": True}
