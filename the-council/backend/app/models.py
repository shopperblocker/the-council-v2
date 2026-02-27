"""
Database Models: SQLAlchemy ORM models for The Council.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Float, Integer, DateTime, ForeignKey, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mode: Mapped[str] = mapped_column(String(50))  # "war_room", "private_desk", "junto"
    topic: Mapped[str] = mapped_column(Text, nullable=True)
    user_context: Mapped[dict] = mapped_column(JSON, default=dict)
    agents: Mapped[list] = mapped_column(JSON, default=list)  # Agent names in this session
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    messages: Mapped[list["Message"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("sessions.id"), index=True)
    sender: Mapped[str] = mapped_column(String(100))  # "user" or agent name like "Rockefeller"
    sender_type: Mapped[str] = mapped_column(String(20))  # "user" or "agent"
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    session: Mapped["Session"] = relationship(back_populates="messages")


class SharedMemory(Base):
    __tablename__ = "shared_memory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(100), index=True)
    key: Mapped[str] = mapped_column(String(200))
    value: Mapped[str] = mapped_column(Text)
    source_agent: Mapped[str] = mapped_column(String(100))
    confidence: Mapped[float] = mapped_column(Float, default=0.7)
    session_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


# ══════════════════════════════════════════
# USER PROFILE
# ══════════════════════════════════════════

class UserProfile(Base):
    """Editable user profile — replaces hardcoded USER_DOSSIER."""
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), default="Kyle Kivuvani")
    age: Mapped[int] = mapped_column(Integer, default=19)
    location: Mapped[str] = mapped_column(String(200), default="Washington, DC")
    origin: Mapped[str] = mapped_column(String(200), default="Kenya")
    school: Mapped[str] = mapped_column(String(200), default="Howard University")
    major: Mapped[str] = mapped_column(String(200), default="International Business")
    year: Mapped[str] = mapped_column(String(50), default="Freshman")
    north_star: Mapped[str] = mapped_column(Text, default="Refuses to waste his potential.")
    core_fear: Mapped[str] = mapped_column(Text, default="The thought of my mom dying ashamed of me disgusts me.")
    war_fronts: Mapped[dict] = mapped_column(JSON, default=dict)
    tuition_target: Mapped[float] = mapped_column(Float, default=30000.0)
    tuition_deadline: Mapped[str] = mapped_column(String(50), default="August 2025")
    budget_notes: Mapped[str] = mapped_column(Text, default="")
    psychological_framework: Mapped[dict] = mapped_column(JSON, default=dict)
    what_works: Mapped[list] = mapped_column(JSON, default=list)
    constraints: Mapped[list] = mapped_column(JSON, default=list)
    custom_sections: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


# ══════════════════════════════════════════
# FINANCIAL HQ
# ══════════════════════════════════════════

class FinancialAccount(Base):
    __tablename__ = "financial_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    account_type: Mapped[str] = mapped_column(String(50))  # savings, checking, investment, goal
    balance: Mapped[float] = mapped_column(Float, default=0.0)
    target: Mapped[float] = mapped_column(Float, nullable=True)
    target_date: Mapped[str] = mapped_column(String(50), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(Integer, ForeignKey("financial_accounts.id"), index=True)
    amount: Mapped[float] = mapped_column(Float)  # Positive = income, Negative = expense
    category: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text, nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class PortfolioPosition(Base):
    __tablename__ = "portfolio_positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(20))
    shares: Mapped[float] = mapped_column(Float)
    avg_cost: Mapped[float] = mapped_column(Float)
    added_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


# ══════════════════════════════════════════
# PLANS HUB
# ══════════════════════════════════════════

class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50))  # business, academic, health, financial
    status: Mapped[str] = mapped_column(String(30), default="active")  # active, completed, abandoned
    target_date: Mapped[str] = mapped_column(String(50), nullable=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    milestones: Mapped[list["Milestone"]] = relationship(back_populates="plan", cascade="all, delete-orphan")


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("plans.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    completed: Mapped[bool] = mapped_column(default=False)
    due_date: Mapped[str] = mapped_column(String(50), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    plan: Mapped["Plan"] = relationship(back_populates="milestones")


# ══════════════════════════════════════════
# ACADEMY
# ══════════════════════════════════════════

class StudyPath(Base):
    __tablename__ = "study_paths"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subject: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), default="beginner")
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    topics: Mapped[list["StudyTopic"]] = relationship(back_populates="path", cascade="all, delete-orphan")


class StudyTopic(Base):
    __tablename__ = "study_topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    path_id: Mapped[int] = mapped_column(Integer, ForeignKey("study_paths.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    order: Mapped[int] = mapped_column(Integer, default=0)
    mastery_level: Mapped[str] = mapped_column(String(20), default="not_started")
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    feynman_explanation: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    path: Mapped["StudyPath"] = relationship(back_populates="topics")


# ══════════════════════════════════════════
# BUSINESS ENGINE
# ══════════════════════════════════════════

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(500))
    sku: Mapped[str] = mapped_column(String(100), nullable=True)
    category: Mapped[str] = mapped_column(String(100))
    source_platform: Mapped[str] = mapped_column(String(50))
    source_price: Mapped[float] = mapped_column(Float)
    target_platform: Mapped[str] = mapped_column(String(50))
    target_price: Mapped[float] = mapped_column(Float, nullable=True)
    estimated_profit: Mapped[float] = mapped_column(Float, nullable=True)
    roi_pct: Mapped[float] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="researching")
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=True)
    platform: Mapped[str] = mapped_column(String(50))
    order_type: Mapped[str] = mapped_column(String(20))  # buy, sell
    amount: Mapped[float] = mapped_column(Float)
    fees: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(30))  # pending, shipped, delivered, completed
    tracking: Mapped[str] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
