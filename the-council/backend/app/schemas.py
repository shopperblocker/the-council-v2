"""
API Schemas: Pydantic models for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


# ── Requests ──

class DebateRequest(BaseModel):
    """Start a War Room debate."""
    question: str = Field(..., min_length=1, max_length=2000)
    agents: list[str] = Field(default=[], max_length=5, description="Agent names. Empty = auto-select.")


class MessageRequest(BaseModel):
    """Send a follow-up message in an active session."""
    content: str = Field(..., min_length=1, max_length=2000)
    mention: Optional[str] = Field(default=None, description="@mention a specific agent.")


class PrivateDeskRequest(BaseModel):
    """Start a Private Desk 1-on-1 conversation."""
    agent: str = Field(..., description="Agent name (e.g., 'Rockefeller')")
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[UUID] = Field(default=None, description="Continue existing session")


# ── Responses ──

class AgentInfo(BaseModel):
    name: str
    display_name: str
    role: str
    emoji: str
    color: str
    board: str
    voice: str
    core_belief: str
    specializations: list[str]


class MessageOut(BaseModel):
    id: int
    sender: str
    sender_type: str
    content: str
    created_at: datetime


class SessionOut(BaseModel):
    id: UUID
    mode: str
    topic: Optional[str]
    agents: list[str]
    created_at: datetime
    messages: list[MessageOut] = []


class DebateStarted(BaseModel):
    session_id: UUID
    agents: list[str]
    topic: str


# ── SSE Event Types ──
# These are sent as Server-Sent Events during streaming:
#
# event: debate_start
# data: {"session_id": "...", "agents": ["Rockefeller", "Napoleon"], "topic": "..."}
#
# event: agent_start
# data: {"agent": "Rockefeller", "emoji": "💰", "color": "#059669"}
#
# event: agent_token
# data: {"agent": "Rockefeller", "token": "The key "}
#
# event: agent_end
# data: {"agent": "Rockefeller"}
#
# event: round_end
# data: {"round": 1, "message_count": 3}
#
# event: error
# data: {"message": "Something went wrong"}
