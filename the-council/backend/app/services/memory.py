"""
Memory Service: Persistent cross-session memory for The Council.

Stores facts extracted from conversations so agents can recall prior context.
"""

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SharedMemory
from app.services.ai import get_ai_service

logger = logging.getLogger(__name__)


class MemoryService:
    """Manages shared memory across Council sessions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def store(
        self,
        category: str,
        key: str,
        value: str,
        source_agent: str,
        session_id=None,
        confidence: float = 0.7,
    ) -> SharedMemory:
        """Store a fact in shared memory."""
        memory = SharedMemory(
            category=category,
            key=key,
            value=value,
            source_agent=source_agent,
            confidence=confidence,
            session_id=session_id,
        )
        self.db.add(memory)
        await self.db.flush()
        return memory

    async def recall(
        self,
        category: str | None = None,
        limit: int = 20,
    ) -> list[SharedMemory]:
        """Recall memories, optionally filtered by category."""
        query = select(SharedMemory).order_by(SharedMemory.created_at.desc()).limit(limit)
        if category:
            query = query.where(SharedMemory.category == category)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def recall_for_prompt(self, categories: list[str] | None = None) -> str:
        """Format recalled memories for injection into agent system prompts."""
        if categories:
            memories = []
            for cat in categories:
                memories.extend(await self.recall(category=cat, limit=10))
        else:
            memories = await self.recall(limit=20)

        if not memories:
            return ""

        lines = []
        for m in memories:
            lines.append(f"- [{m.category}] {m.key}: {m.value}")

        return "### SHARED MEMORY\nFacts remembered from prior sessions:\n" + "\n".join(lines)

    async def get_accountability_context(self, days: int = 14) -> str:
        """
        Return a formatted string of recent commitments Kyle made to his advisors.

        Injected into agent prompts so advisors can follow up on what Kyle
        said he would do. Only pulls 'commitment' category memories from
        the last `days` days.
        """
        from datetime import datetime, timezone, timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        result = await self.db.execute(
            select(SharedMemory)
            .where(SharedMemory.category == "commitment")
            .where(SharedMemory.created_at >= cutoff)
            .order_by(SharedMemory.created_at.desc())
            .limit(10)
        )
        commitments = list(result.scalars().all())
        if not commitments:
            return ""

        lines = [f"- {m.key}: {m.value} (advised by {m.source_agent})" for m in commitments]
        return (
            "### ACCOUNTABILITY\n"
            "Kyle made these commitments in recent sessions. "
            "If relevant, check in on them — hold him to what he said he'd do:\n"
            + "\n".join(lines)
        )

    async def extract_and_store(
        self,
        agent_name: str,
        agent_response: str,
        user_message: str,
        session_id=None,
    ):
        """Extract memorable facts from a conversation turn using Haiku."""
        ai = get_ai_service()

        prompt = f"""Extract key facts worth remembering from this conversation turn.
Only extract CONCRETE, SPECIFIC facts about Kyle (decisions, numbers, deadlines, preferences, commitments).
Do NOT extract opinions, general advice, or vague statements.

USER said: {user_message}
AGENT ({agent_name}) responded: {agent_response[:500]}

If there are facts worth remembering, respond with a JSON array like:
[{{"category": "financial", "key": "tuition_saved", "value": "$5000 saved so far"}}]

Categories: financial, business, academic, personal, health, goals, decisions, commitment
Use "commitment" for any specific action Kyle says he will take or agrees to do.

If nothing worth remembering, respond with: []"""

        try:
            response = await ai.generate(
                system_prompt="Extract facts as JSON. Only concrete, specific information.",
                messages=[{"role": "user", "content": prompt}],
                model=ai.model_router,
                max_tokens=300,
                temperature=0.0,
            )

            import json
            cleaned = response.strip().strip("`").strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            facts = json.loads(cleaned)

            if isinstance(facts, list):
                for fact in facts:
                    if isinstance(fact, dict) and "category" in fact and "key" in fact and "value" in fact:
                        await self.store(
                            category=fact["category"],
                            key=fact["key"],
                            value=fact["value"],
                            source_agent=agent_name,
                            session_id=session_id,
                        )
                if facts:
                    logger.info("Stored %d memories from %s", len(facts), agent_name)
        except Exception as e:
            logger.warning("Memory extraction failed: %s", e)
