"""
Private Desk Orchestrator: 1-on-1 conversations with a single advisor.

Unlike the War Room (multi-agent debate), this is a direct conversation
between Kyle and one chosen advisor. Supports tool use and session continuity.
"""

import json
import uuid
from typing import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.agents.registry import AGENTS
from app.agents.prompts import build_private_desk_prompt
from app.models import Session, Message
from app.services.ai import get_ai_service
from app.services.tools import TOOL_DEFINITIONS


class PrivateDeskOrchestrator:
    """Handles 1-on-1 advisory conversations."""

    def __init__(self):
        self.ai = get_ai_service()

    async def start_conversation(
        self,
        agent_name: str,
        message: str,
        db: AsyncSession,
    ) -> AsyncIterator[str]:
        """
        Start a new Private Desk session and stream the agent's first response.

        Yields raw SSE strings: "event: ...\ndata: ...\n\n"
        """
        # Validate agent exists
        agent = AGENTS.get(agent_name)
        if not agent:
            yield f"event: error\ndata: {json.dumps({'message': f'Agent {agent_name} not found'})}\n\n"
            return

        # Create session
        session = Session(
            mode="private_desk",
            topic=message[:200],
            agents=[agent_name],
        )
        db.add(session)
        await db.flush()  # Get the session ID without committing yet

        # Save user's opening message
        user_msg = Message(
            session_id=session.id,
            sender="user",
            sender_type="user",
            content=message,
        )
        db.add(user_msg)
        await db.flush()

        # Emit conversation_start event
        start_data = {
            "session_id": str(session.id),
            "agent": agent_name,
            "display_name": agent.display_name,
            "emoji": agent.emoji,
            "color": agent.color,
            "role": agent.role,
        }
        yield f"event: conversation_start\ndata: {json.dumps(start_data)}\n\n"

        # Build conversation history for the AI
        ai_messages = [{"role": "user", "content": message}]
        system_prompt = build_private_desk_prompt(agent)

        # Stream the response
        full_response = ""
        tool_was_called = False

        async for chunk in self.ai.stream_with_tools(
            system_prompt=system_prompt,
            messages=ai_messages,
            tools=TOOL_DEFINITIONS,
            model=self.ai.model_chat,
            max_tokens=1500,
            temperature=agent.temperature,
        ):
            if chunk["type"] == "tool_call":
                tool_was_called = True
                yield f"event: tool_call\ndata: {json.dumps({'tool': chunk['tool']})}\n\n"
            elif chunk["type"] == "token":
                full_response += chunk["text"]
                yield f"event: agent_token\ndata: {json.dumps({'agent': agent_name, 'token': chunk['text']})}\n\n"

        # Save agent's response
        agent_msg = Message(
            session_id=session.id,
            sender=agent_name,
            sender_type="agent",
            content=full_response,
        )
        db.add(agent_msg)

        # Emit done event
        done_data = {
            "session_id": str(session.id),
            "agent": agent_name,
            "message_count": 2,
        }
        yield f"event: conversation_end\ndata: {json.dumps(done_data)}\n\n"

    async def continue_conversation(
        self,
        session_id: uuid.UUID,
        message: str,
        db: AsyncSession,
    ) -> AsyncIterator[str]:
        """
        Continue an existing Private Desk session.

        Loads full conversation history so the agent remembers everything.
        Yields raw SSE strings.
        """
        # Load session
        result = await db.execute(select(Session).where(Session.id == session_id))
        session = result.scalar_one_or_none()
        if not session:
            yield f"event: error\ndata: {json.dumps({'message': 'Session not found'})}\n\n"
            return

        agent_name = session.agents[0] if session.agents else None
        agent = AGENTS.get(agent_name)
        if not agent:
            yield f"event: error\ndata: {json.dumps({'message': f'Agent {agent_name} not found'})}\n\n"
            return

        # Load full message history
        msg_result = await db.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at)
        )
        history = msg_result.scalars().all()

        # Save this new user message
        user_msg = Message(
            session_id=session_id,
            sender="user",
            sender_type="user",
            content=message,
        )
        db.add(user_msg)
        await db.flush()

        # Build AI message history (convert DB records to Anthropic format)
        ai_messages = []
        for msg in history:
            role = "user" if msg.sender_type == "user" else "assistant"
            ai_messages.append({"role": role, "content": msg.content})
        ai_messages.append({"role": "user", "content": message})

        system_prompt = build_private_desk_prompt(agent)

        # Emit agent_start
        yield f"event: agent_start\ndata: {json.dumps({'agent': agent_name, 'display_name': agent.display_name, 'emoji': agent.emoji, 'color': agent.color})}\n\n"

        # Stream response
        full_response = ""

        async for chunk in self.ai.stream_with_tools(
            system_prompt=system_prompt,
            messages=ai_messages,
            tools=TOOL_DEFINITIONS,
            model=self.ai.model_chat,
            max_tokens=1500,
            temperature=agent.temperature,
        ):
            if chunk["type"] == "tool_call":
                yield f"event: tool_call\ndata: {json.dumps({'tool': chunk['tool']})}\n\n"
            elif chunk["type"] == "token":
                full_response += chunk["text"]
                yield f"event: agent_token\ndata: {json.dumps({'agent': agent_name, 'token': chunk['text']})}\n\n"

        # Save agent's response
        agent_msg = Message(
            session_id=session_id,
            sender=agent_name,
            sender_type="agent",
            content=full_response,
        )
        db.add(agent_msg)

        # Count total messages
        total = len(history) + 2  # +2 for the new user msg and this response
        yield f"event: conversation_end\ndata: {json.dumps({'session_id': str(session_id), 'agent': agent_name, 'message_count': total})}\n\n"


# Singleton
_orchestrator: PrivateDeskOrchestrator | None = None

def get_private_desk_orchestrator() -> PrivateDeskOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = PrivateDeskOrchestrator()
    return _orchestrator
