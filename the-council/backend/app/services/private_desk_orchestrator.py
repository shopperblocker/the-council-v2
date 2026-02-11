"""
Private Desk Orchestrator: Manages 1-on-1 conversations with streaming.

This orchestrator handles Private Desk mode where Kyle has focused,
private conversations with a single advisor. Similar to War Room but
simplified for single-agent interactions.
"""

import json
import uuid
from typing import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Session, Message
from app.agents.registry import AgentConfig, get_agent
from app.agents.prompts import build_private_desk_prompt
from app.services.ai import get_ai_service
from app.services.tools import TOOL_DEFINITIONS


class PrivateDeskOrchestrator:
    """Orchestrates Private Desk 1-on-1 conversations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai = get_ai_service()

    async def start_conversation(
        self,
        agent_name: str,
        user_message: str,
    ) -> AsyncIterator[str]:
        """
        Start a new Private Desk 1-on-1 conversation. Yields SSE-formatted events.

        Flow:
        1. Validate agent exists
        2. Create session (mode="private_desk")
        3. Save user message
        4. Stream agent response
        """
        # Step 1: Validate agent
        agent = get_agent(agent_name)
        if not agent:
            yield self._sse("error", {"message": f"Agent '{agent_name}' not found."})
            return

        # Step 2: Create session
        session = Session(
            id=uuid.uuid4(),
            mode="private_desk",
            topic=user_message[:200],  # First 200 chars as topic
            agents=[agent.name],
        )
        self.db.add(session)
        await self.db.flush()

        # Step 3: Save user message
        user_msg = Message(
            session_id=session.id,
            sender="user",
            sender_type="user",
            content=user_message,
        )
        self.db.add(user_msg)
        await self.db.flush()

        # Emit conversation start event
        yield self._sse("conversation_start", {
            "session_id": str(session.id),
            "agent": {
                "name": agent.name,
                "display_name": agent.display_name,
                "emoji": agent.emoji,
                "color": agent.color,
                "role": agent.role,
            },
            "topic": session.topic,
        })

        # Step 4: Stream agent response
        system_prompt = build_private_desk_prompt(agent, session.topic)
        messages = [{"role": "user", "content": user_message}]

        # Emit agent start
        yield self._sse("agent_start", {
            "agent": agent.name,
            "display_name": agent.display_name,
            "emoji": agent.emoji,
            "color": agent.color,
        })

        # Stream the response with tools enabled
        full_response = ""
        async for token in self.ai.stream_with_tools(
            system_prompt=system_prompt,
            messages=messages,
            tools=TOOL_DEFINITIONS,
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

        # Emit agent end
        yield self._sse("agent_end", {"agent": agent.name})

        # Emit round end
        yield self._sse("round_end", {
            "session_id": str(session.id),
            "message_count": 2,  # User + agent
        })

        await self.db.commit()

    async def continue_conversation(
        self,
        session_id: uuid.UUID,
        user_message: str,
    ) -> AsyncIterator[str]:
        """
        Continue an existing Private Desk conversation.

        Loads full conversation history and uses it as context for the next response.
        """
        # Load session
        result = await self.db.execute(select(Session).where(Session.id == session_id))
        session = result.scalar_one_or_none()
        if not session:
            yield self._sse("error", {"message": "Session not found."})
            return

        # Validate it's a private desk session
        if session.mode != "private_desk":
            yield self._sse("error", {"message": "This is not a Private Desk session."})
            return

        # Get the agent
        agent_name = session.agents[0] if session.agents else None
        if not agent_name:
            yield self._sse("error", {"message": "No agent found for this session."})
            return

        agent = get_agent(agent_name)
        if not agent:
            yield self._sse("error", {"message": f"Agent '{agent_name}' not found."})
            return

        # Save user message
        user_msg = Message(
            session_id=session.id,
            sender="user",
            sender_type="user",
            content=user_message,
        )
        self.db.add(user_msg)
        await self.db.flush()

        # Load full conversation history
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
                # Agent message
                conversation_messages.append({"role": "assistant", "content": msg.content})

        # Build system prompt
        system_prompt = build_private_desk_prompt(agent, session.topic)

        # Emit agent start
        yield self._sse("agent_start", {
            "agent": agent.name,
            "display_name": agent.display_name,
            "emoji": agent.emoji,
            "color": agent.color,
        })

        # Stream response with tools enabled
        full_response = ""
        async for token in self.ai.stream_with_tools(
            system_prompt=system_prompt,
            messages=conversation_messages,
            tools=TOOL_DEFINITIONS,
            temperature=agent.temperature,
        ):
            full_response += token
            yield self._sse("agent_token", {"agent": agent.name, "token": token})

        # Save agent message
        agent_msg = Message(
            session_id=session.id,
            sender=agent.name,
            sender_type="agent",
            content=full_response,
        )
        self.db.add(agent_msg)
        await self.db.flush()

        # Emit agent end
        yield self._sse("agent_end", {"agent": agent.name})

        # Emit round end
        yield self._sse("round_end", {
            "session_id": str(session.id),
            "message_count": len(history) + 1,  # +1 for new agent message
        })

        await self.db.commit()

    def _sse(self, event: str, data: dict) -> str:
        """Format a Server-Sent Event."""
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"
