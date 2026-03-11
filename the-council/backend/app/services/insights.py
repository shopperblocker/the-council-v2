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
        source_mode: str | None = None,
        conversation_id: str | None = None,
    ) -> Insight | None:
        """Use Haiku to extract structured insights from a conversation turn."""
        import json
        ai = get_ai_service()

        prompt = f"""Analyze this conversation turn for insights worth flagging to Kyle.

USER: {user_message}
{agent_name}: {agent_response[:800]}

If there's a genuinely important insight, respond with JSON:
{{
  "type": "opportunity|warning|pattern|consensus",
  "title": "Short compelling title (max 80 chars)",
  "summary": "2-3 sentence insight with context",
  "key_points": ["Point 1", "Point 2", "Point 3"],
  "recommended_actions": ["Action 1", "Action 2"],
  "tags": ["tag1", "tag2"],
  "priority": "high|medium|low"
}}

Types: opportunity = act now, warning = risk/red flag, pattern = recurring theme, consensus = multiple advisors agree.
If nothing worth flagging, respond with: null"""

        try:
            response = await ai.generate(
                system_prompt="Extract structured insights as JSON. Be selective — only flag high-signal observations.",
                messages=[{"role": "user", "content": prompt}],
                model=ai.model_router,
                max_tokens=500,
                temperature=0.0,
            )

            cleaned = response.strip().strip("`").strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            if cleaned in ("null", "None", ""):
                return None

            data = json.loads(cleaned)
            if isinstance(data, dict) and "title" in data:
                insight = Insight(
                    agent_name=agent_name,
                    insight_type=data.get("type", "pattern"),
                    title=data["title"],
                    content=data.get("summary", ""),  # backward compat
                    summary=data.get("summary", ""),
                    key_points=data.get("key_points", []),
                    recommended_actions=data.get("recommended_actions", []),
                    tags=data.get("tags", []),
                    priority=data.get("priority", "medium"),
                    source_mode=source_mode,
                    conversation_id=conversation_id,
                )
                self.db.add(insight)
                await self.db.flush()
                logger.info("Generated insight from %s: %s", agent_name, data["title"])
                return insight
        except Exception as e:
            logger.warning("Insight generation failed: %s", e)

        return None

    async def extract_from_session(self, session_id: str) -> list[Insight]:
        """Manually trigger insight extraction for a full session."""
        import json
        from sqlalchemy import text
        ai = get_ai_service()

        rows = (await self.db.execute(
            text("SELECT sender, sender_type, content FROM messages WHERE session_id = :sid ORDER BY created_at"),
            {"sid": session_id},
        )).fetchall()
        if not rows:
            return []

        transcript = "\n\n".join(
            f"{'USER' if r.sender_type == 'user' else r.sender}: {r.content[:600]}"
            for r in rows
        )

        sess_row = (await self.db.execute(
            text("SELECT mode FROM sessions WHERE id = :sid"),
            {"sid": session_id},
        )).fetchone()
        source_mode = sess_row.mode if sess_row else None

        prompt = f"""Analyze this conversation and extract up to 3 high-value insights.

TRANSCRIPT:
{transcript[:3000]}

Respond with a JSON array (can be []). Each item:
{{
  "agent": "agent_name",
  "type": "opportunity|warning|pattern|consensus",
  "title": "Short compelling title",
  "summary": "2-3 sentence insight",
  "key_points": ["Point 1", "Point 2"],
  "recommended_actions": ["Action 1"],
  "tags": ["tag1"],
  "priority": "high|medium|low"
}}"""

        insights: list[Insight] = []
        try:
            response = await ai.generate(
                system_prompt="Extract structured insights as JSON array. Be selective.",
                messages=[{"role": "user", "content": prompt}],
                model=ai.model_router,
                max_tokens=1000,
                temperature=0.0,
            )
            cleaned = response.strip().strip("`").strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()

            items = json.loads(cleaned)
            if isinstance(items, list):
                for item in items[:3]:
                    if not isinstance(item, dict) or "title" not in item:
                        continue
                    ins = Insight(
                        agent_name=item.get("agent", "council"),
                        insight_type=item.get("type", "pattern"),
                        title=item["title"],
                        content=item.get("summary", ""),
                        summary=item.get("summary", ""),
                        key_points=item.get("key_points", []),
                        recommended_actions=item.get("recommended_actions", []),
                        tags=item.get("tags", []),
                        priority=item.get("priority", "medium"),
                        source_mode=source_mode,
                        conversation_id=session_id,
                    )
                    self.db.add(ins)
                    insights.append(ins)
                if insights:
                    await self.db.flush()
                    logger.info("Extracted %d insights from session %s", len(insights), session_id)
        except Exception as e:
            logger.warning("Session insight extraction failed: %s", e)

        return insights
