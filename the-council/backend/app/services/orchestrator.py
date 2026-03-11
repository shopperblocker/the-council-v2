"""
War Room Orchestrator: Manages multi-agent debates with streaming.

This is the brain of the War Room. It:
1. Routes questions to the right agents (via Haiku)
2. Orchestrates speaking order
3. Streams each agent's response in real-time
4. Persists everything to PostgreSQL
5. Writes cross-session memories and generates insights after each turn
6. Synthesizes the full debate at round end using Opus
"""

import json
import logging
import uuid
from typing import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger(__name__)

from app.models import Session, Message
from app.agents.registry import AgentConfig, get_agent, get_all_agents, AGENTS
from app.agents.prompts import build_debate_prompt, build_followup_prompt
from app.services.ai import get_ai_service
from app.services.profile import ProfileService
from app.services.memory import MemoryService
from app.services.insights import InsightService
from app.utils.sse import format_sse


class WarRoomOrchestrator:
    """Orchestrates War Room multi-agent debates."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai = get_ai_service()
        self.profile_service = ProfileService(db)
        self.memory_service = MemoryService(db)
        self.insight_service = InsightService(db)

    async def start_debate(
        self,
        question: str,
        agent_names: list[str] | None = None,
    ) -> AsyncIterator[str]:
        """
        Start a new War Room debate. Yields SSE-formatted events.

        Flow:
        1. Route question to agents (if not specified)
        2. Create session
        3. Save user message
        4. Stream each agent's response
        5. After each agent: extract memories + generate insights
        6. After round: synthesize with Opus and emit synthesis event
        """
        # Step 1: Select agents
        if not agent_names:
            all_agents = [
                {"name": a.name, "role": a.role, "voice": a.voice, "board": a.board.value}
                for a in get_all_agents()
            ]
            agent_names = await self.ai.route_query(question, all_agents)

        # Validate agent names
        agents: list[AgentConfig] = []
        for name in agent_names:
            agent = get_agent(name)
            if agent:
                agents.append(agent)
        if not agents:
            yield format_sse("error", {"message": "No valid agents selected."})
            return

        # Step 2: Create session
        session = Session(
            id=uuid.uuid4(),
            mode="war_room",
            topic=question,
            agents=[a.name for a in agents],
        )
        self.db.add(session)
        await self.db.flush()

        # Step 3: Save user message
        user_msg = Message(
            session_id=session.id,
            sender="user",
            sender_type="user",
            content=question,
        )
        self.db.add(user_msg)
        await self.db.flush()

        # Emit debate start event
        yield format_sse("debate_start", {
            "session_id": str(session.id),
            "agents": [
                {"name": a.name, "display_name": a.display_name, "emoji": a.emoji, "color": a.color, "role": a.role}
                for a in agents
            ],
            "topic": question,
        })

        # Step 4: Stream each agent's response
        # Fetch dynamic dossier, shared memory, and accountability context
        dossier = await self.profile_service.to_dossier_string()
        memory_context = await self.memory_service.recall_for_prompt()
        accountability = await self.memory_service.get_accountability_context()
        full_memory_context = memory_context + ("\n" + accountability if accountability else "")

        prior_messages: list[dict] = []
        agent_responses: list[dict] = []  # For synthesis

        try:
            for agent in agents:
                # Build prompt with context of prior responses
                system_prompt = build_debate_prompt(
                    agent, question, prior_messages,
                    dossier=dossier, memory_context=full_memory_context,
                )

                # Emit agent start
                yield format_sse("agent_start", {
                    "agent": agent.name,
                    "display_name": agent.display_name,
                    "emoji": agent.emoji,
                    "color": agent.color,
                })

                # Stream the response
                full_response = ""
                messages = [{"role": "user", "content": question}]

                async for token in self.ai.stream(
                    system_prompt=system_prompt,
                    messages=messages,
                    temperature=agent.temperature,
                ):
                    full_response += token
                    yield format_sse("agent_token", {"agent": agent.name, "token": token})

                # Validate non-empty response
                if not full_response.strip():
                    logger.warning("Agent %s returned empty response", agent.name)
                    yield format_sse("error", {"message": f"{agent.display_name} returned no response"})
                    yield format_sse("agent_end", {"agent": agent.name})
                    continue

                # Save agent message to DB
                agent_msg = Message(
                    session_id=session.id,
                    sender=agent.name,
                    sender_type="agent",
                    content=full_response,
                )
                self.db.add(agent_msg)
                await self.db.flush()

                # Extract memories and generate insights
                await self.memory_service.extract_and_store(
                    agent.name, full_response, question, session.id
                )
                await self.insight_service.generate_insight(agent.name, question, full_response)

                # Track for context and synthesis
                prior_messages.append({
                    "sender": agent.display_name,
                    "content": full_response,
                })
                agent_responses.append({
                    "sender": agent.display_name,
                    "sender_type": "agent",
                    "content": full_response,
                })

                # Emit agent end
                yield format_sse("agent_end", {"agent": agent.name})

            # Step 5: Synthesize with Opus and emit
            synthesis = ""
            try:
                synthesis = await self.ai.synthesize_debate(question, agent_responses)
                yield format_sse("synthesis", {"content": synthesis})
            except Exception as e:
                logger.warning("Synthesis failed: %s", e)
                yield format_sse("error", {"message": f"Synthesis unavailable: {str(e)}"})

            # Emit round end
            yield format_sse("round_end", {
                "round": 1,
                "session_id": str(session.id),
                "message_count": len(prior_messages),
                "has_synthesis": bool(synthesis),
            })

            await self.db.commit()

        except Exception as e:
            await self.db.rollback()
            logger.error("War Room debate failed: %s", e, exc_info=True)
            yield format_sse("error", {"message": f"Debate failed: {str(e)}"})
            yield format_sse("round_end", {
                "round": 1,
                "session_id": str(session.id),
                "message_count": len(prior_messages),
            })

    async def follow_up(
        self,
        session_id: uuid.UUID,
        content: str,
        mention: str | None = None,
    ) -> AsyncIterator[str]:
        """
        Handle a follow-up message in an existing debate.

        If a specific agent is @mentioned, only that agent responds.
        Otherwise, all session agents respond.
        """
        # Load session
        result = await self.db.execute(select(Session).where(Session.id == session_id))
        session = result.scalar_one_or_none()
        if not session:
            yield format_sse("error", {"message": "Session not found."})
            return

        # Save user follow-up
        user_msg = Message(
            session_id=session.id,
            sender="user",
            sender_type="user",
            content=content,
        )
        self.db.add(user_msg)
        await self.db.flush()

        # Load conversation history for context
        msg_result = await self.db.execute(
            select(Message)
            .where(Message.session_id == session.id)
            .order_by(Message.created_at)
        )
        history = msg_result.scalars().all()

        # Build conversation messages for Claude
        conversation_messages = []
        for msg in history:
            if msg.sender_type == "user":
                conversation_messages.append({"role": "user", "content": msg.content})
            else:
                conversation_messages.append({
                    "role": "assistant",
                    "content": f"[{msg.sender}]: {msg.content}",
                })

        # Determine which agents respond
        # Validate @mention against the session's own agent list (not global registry)
        if mention and mention in session.agents:
            responding_agents = [get_agent(mention)]
        else:
            responding_agents = [get_agent(name) for name in session.agents if get_agent(name)]

        # Fetch dynamic dossier, shared memory, and accountability context
        dossier = await self.profile_service.to_dossier_string()
        memory_context = await self.memory_service.recall_for_prompt()
        accountability = await self.memory_service.get_accountability_context()
        full_memory_context = memory_context + ("\n" + accountability if accountability else "")

        # Stream responses — track this round's responses so each agent sees
        # what prior agents in the same round have said (mirrors start_debate behaviour)
        prior_messages = []
        agent_responses = []
        try:
            for agent in responding_agents:
                if agent is None:
                    continue

                system_prompt = build_followup_prompt(
                    agent, session.topic, prior_messages,
                    dossier=dossier, memory_context=full_memory_context,
                )

                yield format_sse("agent_start", {
                    "agent": agent.name,
                    "display_name": agent.display_name,
                    "emoji": agent.emoji,
                    "color": agent.color,
                })

                full_response = ""
                async for token in self.ai.stream(
                    system_prompt=system_prompt,
                    messages=conversation_messages,
                    temperature=agent.temperature,
                ):
                    full_response += token
                    yield format_sse("agent_token", {"agent": agent.name, "token": token})

                # Validate non-empty response
                if not full_response.strip():
                    logger.warning("Agent %s returned empty follow-up response", agent.name)
                    yield format_sse("error", {"message": f"{agent.display_name} returned no response"})
                    yield format_sse("agent_end", {"agent": agent.name})
                    continue

                # Save
                agent_msg = Message(
                    session_id=session.id,
                    sender=agent.name,
                    sender_type="agent",
                    content=full_response,
                )
                self.db.add(agent_msg)
                await self.db.flush()

                # Extract memories and generate insights
                await self.memory_service.extract_and_store(
                    agent.name, full_response, content, session.id
                )
                await self.insight_service.generate_insight(agent.name, content, full_response)

                prior_messages.append({"sender": agent.display_name, "content": full_response})
                agent_responses.append({
                    "sender": agent.display_name,
                    "sender_type": "agent",
                    "content": full_response,
                })

                yield format_sse("agent_end", {"agent": agent.name})

            # Synthesize follow-up round
            synthesis = ""
            try:
                if agent_responses:
                    synthesis = await self.ai.synthesize_debate(
                        f"{session.topic} — follow-up: {content}", agent_responses
                    )
                    yield format_sse("synthesis", {"content": synthesis})
            except Exception as e:
                logger.warning("Follow-up synthesis failed: %s", e)
                yield format_sse("error", {"message": f"Synthesis unavailable: {str(e)}"})

            yield format_sse("round_end", {
                "session_id": str(session.id),
                "message_count": len(prior_messages),
                "has_synthesis": bool(synthesis),
            })

            await self.db.commit()

        except Exception as e:
            await self.db.rollback()
            logger.error("War Room follow-up failed: %s", e, exc_info=True)
            yield format_sse("error", {"message": f"Follow-up failed: {str(e)}"})
            yield format_sse("round_end", {
                "session_id": str(session.id),
                "message_count": len(prior_messages),
            })

