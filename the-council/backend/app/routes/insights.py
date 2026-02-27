"""
Insights API: Agent-generated autonomous insights.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.insights import InsightService

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("")
async def list_unviewed_insights(limit: int = 10, db: AsyncSession = Depends(get_db)):
    """Get unviewed insights."""
    service = InsightService(db)
    insights = await service.list_unviewed(limit=limit)
    return [
        {
            "id": i.id,
            "agent_name": i.agent_name,
            "insight_type": i.insight_type,
            "title": i.title,
            "content": i.content,
            "priority": i.priority,
            "viewed": i.viewed,
            "acted_on": i.acted_on,
            "created_at": i.created_at.isoformat(),
        }
        for i in insights
    ]


@router.get("/all")
async def list_all_insights(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Get all insights with pagination."""
    service = InsightService(db)
    insights = await service.list_all(limit=limit, offset=offset)
    return [
        {
            "id": i.id,
            "agent_name": i.agent_name,
            "insight_type": i.insight_type,
            "title": i.title,
            "content": i.content,
            "priority": i.priority,
            "viewed": i.viewed,
            "acted_on": i.acted_on,
            "created_at": i.created_at.isoformat(),
        }
        for i in insights
    ]


@router.patch("/{insight_id}/view")
async def mark_insight_viewed(insight_id: int, db: AsyncSession = Depends(get_db)):
    """Mark an insight as viewed."""
    service = InsightService(db)
    insight = await service.mark_viewed(insight_id)
    if not insight:
        return {"error": "Insight not found"}
    return {"id": insight.id, "viewed": True}


@router.patch("/{insight_id}/act")
async def mark_insight_acted_on(insight_id: int, db: AsyncSession = Depends(get_db)):
    """Mark an insight as acted upon."""
    service = InsightService(db)
    insight = await service.mark_acted_on(insight_id)
    if not insight:
        return {"error": "Insight not found"}
    return {"id": insight.id, "acted_on": True}
