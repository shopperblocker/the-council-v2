"""
War Room Orchestrator: Manages multi-agent debates with streaming.

This is the brain of the War Room. It:
1. Routes questions to the right agents (via Haiku)
2. Orchestrates speaking order
3. Streams each agent's response in real-time
4. Supports follow-up questions and multi-round debates
5. Persists everything to PostgreSQL
"""

import json
import uuid
from typing import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Session, Message
from app.agents.registry import AgentConfig, get_agent, get_all_agents, AGENTS
from app.agents.prompts import build_debate_prompt, build_followup_prompt
from app.services.ai import get_ai_service
from app.services.profile import ProfileService
from app.services.memory import MemoryService


class WarRoomOrchestrator:
    """Orchestrates War Room multi-agent debates."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai = get_ai_service()
        self.profile_service = ProfileService(db)
        self.memory_service = MemoryService(db)

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
            yield self._sse("error", {"message": "No valid agents selected."})
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
        yield self._sse("debate_start", {
            "session_id": str(session.id),
            "agents": [
                {"name": a.name, "display_name": a.display_name, "emoji": a.emoji, "color": a.color, "role": a.role}
                for a in agents
            ],
            "topic": question,
        })

        # Step 4: Stream each agent's response
        # Fetch dynamic dossier and shared memory
        dossier = await self.profile_service.to_dossier_string()
        memory_context = await self.memory_service.recall_for_prompt()

        prior_messages: list[dict] = []

        for agent in agents:
            # Build prompt with context of prior responses
            system_prompt = build_debate_prompt(
                agent, question, prior_messages,
                dossier=dossier, memory_context=memory_context,
            )

            # Emit agent start
            yield self._sse("agent_start", {
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
                yield self._sse("agent_token", {"agent": agent.name, "token": token})

            # Save agent message to DB
            agent_msg = Message(
                session_id=session.id,
                sender=agent.name,
                sender_type="agent",
                content=full_response,
            )
            self.db.add(agent_msg)
            await self.db.flush()

            # Track for context
            prior_messages.append({
                "sender": agent.display_name,
                "content": full_response,
            })

            # Emit agent end
            yield self._sse("agent_end", {"agent": agent.name})

        # Emit round end
        yield self._sse("round_end", {
            "round": 1,
            "session_id": str(session.id),
            "message_count": len(prior_messages),
        })

        await self.db.commit()

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
            yield self._sse("error", {"message": "Session not found."})
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
        if mention and mention in AGENTS:
            responding_agents = [get_agent(mention)]
        else:
            responding_agents = [get_agent(name) for name in session.agents if get_agent(name)]

        # Fetch dynamic dossier and shared memory
        dossier = await self.profile_service.to_dossier_string()
        memory_context = await self.memory_service.recall_for_prompt()

        # Stream responses — track this round's responses so each agent sees
        # what prior agents in the same round have said (mirrors start_debate behaviour)
        prior_messages = []
        for agent in responding_agents:
            if agent is None:
                continue

            system_prompt = build_followup_prompt(
                agent, session.topic, prior_messages,
                dossier=dossier, memory_context=memory_context,
            )

            yield self._sse("agent_start", {
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
                yield self._sse("agent_token", {"agent": agent.name, "token": token})

            # Save
            agent_msg = Message(
                session_id=session.id,
                sender=agent.name,
                sender_type="agent",
                content=full_response,
            )
            self.db.add(agent_msg)
            await self.db.flush()

            prior_messages.append({"sender": agent.display_name, "content": full_response})

            yield self._sse("agent_end", {"agent": agent.name})

        yield self._sse("round_end", {
            "session_id": str(session.id),
            "message_count": len(prior_messages),
        })

        await self.db.commit()

    def _sse(self, event: str, data: dict) -> str:
        """Format a Server-Sent Event."""
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"
