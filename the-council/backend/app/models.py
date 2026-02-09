"""
Database Models: SQLAlchemy ORM models for The Council.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Text, Float, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mode: Mapped[str] = mapped_column(String(50))  # "war_room", "private_desk", "junto"
    topic: Mapped[str] = mapped_column(Text, nullable=True)
    user_context: Mapped[dict] = mapped_column(JSON, default=dict)
    agents: Mapped[list] = mapped_column(JSON, default=list)  # Agent names in this session
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    messages: Mapped[list["Message"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id"))
    sender: Mapped[str] = mapped_column(String(100))  # "user" or agent name like "Rockefeller"
    sender_type: Mapped[str] = mapped_column(String(20))  # "user" or "agent"
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["Session"] = relationship(back_populates="messages")


class SharedMemory(Base):
    __tablename__ = "shared_memory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(100), index=True)
    key: Mapped[str] = mapped_column(String(200))
    value: Mapped[str] = mapped_column(Text)
    source_agent: Mapped[str] = mapped_column(String(100))
    confidence: Mapped[float] = mapped_column(Float, default=0.7)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Insight(Base):
    """Agent-generated insights from autonomous analysis."""
    __tablename__ = "insights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    agent_name: Mapped[str] = mapped_column(String(100))
    insight_type: Mapped[str] = mapped_column(String(50))  # "opportunity", "warning", "pattern", "consensus"
    title: Mapped[str] = mapped_column(String(300))
    content: Mapped[str] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(20), default="medium")  # "high", "medium", "low"
    context_ref: Mapped[str] = mapped_column(Text, nullable=True)
    viewed: Mapped[bool] = mapped_column(default=False)
    acted_on: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
