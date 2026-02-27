"""
Insights Service: Agent-generated autonomous insights.

After conversations, agents can flag patterns, opportunities, and warnings.
"""

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Insight
from app.services.ai import get_ai_service

logger = logging.getLogger(__name__)


class InsightService:
    """Manages agent-generated insights."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_unviewed(self, limit: int = 10) -> list[Insight]:
        """Get unviewed insights, most recent first."""
        result = await self.db.execute(
            select(Insight)
            .where(Insight.viewed == False)  # noqa: E712
            .order_by(Insight.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def list_all(self, limit: int = 50, offset: int = 0) -> list[Insight]:
        """Get all insights with pagination."""
        result = await self.db.execute(
            select(Insight)
            .order_by(Insight.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def mark_viewed(self, insight_id: int) -> Insight | None:
        """Mark an insight as viewed."""
        result = await self.db.execute(select(Insight).where(Insight.id == insight_id))
        insight = result.scalar_one_or_none()
        if insight:
            insight.viewed = True
            await self.db.flush()
        return insight

    async def mark_acted_on(self, insight_id: int) -> Insight | None:
        """Mark an insight as acted upon."""
        result = await self.db.execute(select(Insight).where(Insight.id == insight_id))
        insight = result.scalar_one_or_none()
        if insight:
            insight.acted_on = True
            insight.viewed = True
            await self.db.flush()
        return insight

    async def generate_insight(
        self,
        agent_name: str,
        user_message: str,
        agent_response: str,
    ) -> Insight | None:
        """Use Haiku to extract insights from a conversation turn."""
        ai = get_ai_service()

        prompt = f"""Analyze this conversation for actionable insights worth flagging to Kyle.

USER: {user_message}
{agent_name}: {agent_response[:500]}

If there's a notable insight, respond with JSON:
{{"type": "opportunity|warning|pattern|consensus", "title": "Short title", "content": "1-2 sentence insight", "priority": "high|medium|low"}}

Only flag genuinely important things:
- opportunity: A clear chance Kyle should act on
- warning: A risk or red flag
- pattern: A recurring behavior (good or bad)

If nothing worth flagging, respond with: null"""

        try:
            response = await ai.generate(
                system_prompt="Extract insights as JSON. Only flag genuinely important observations.",
                messages=[{"role": "user", "content": prompt}],
                model=ai.model_router,
                max_tokens=300,
                temperature=0.0,
            )

            import json
            cleaned = response.strip().strip("`").strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            if cleaned == "null" or cleaned == "None":
                return None

            data = json.loads(cleaned)
            if isinstance(data, dict) and "title" in data:
                insight = Insight(
                    agent_name=agent_name,
                    insight_type=data.get("type", "pattern"),
                    title=data["title"],
                    content=data.get("content", ""),
                    priority=data.get("priority", "medium"),
                )
                self.db.add(insight)
                await self.db.flush()
                logger.info("Generated insight from %s: %s", agent_name, data["title"])
                return insight
        except Exception as e:
            logger.warning("Insight generation failed: %s", e)

        return None
