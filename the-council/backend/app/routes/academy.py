"""
Academy Routes: Study paths and topics CRUD.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import StudyPath, StudyTopic

router = APIRouter(prefix="/api/academy", tags=["academy"])


# ── Request Schemas ──

class PathCreate(BaseModel):
    subject: str
    description: Optional[str] = None
    difficulty: str = "beginner"


class PathUpdate(BaseModel):
    subject: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    progress: Optional[float] = None


class TopicCreate(BaseModel):
    title: str
    order: int = 0


class TopicUpdate(BaseModel):
    title: Optional[str] = None
    order: Optional[int] = None
    mastery_level: Optional[str] = None
    notes: Optional[str] = None
    feynman_explanation: Optional[str] = None


# ── Helpers ──

def _path_dict(p: StudyPath, include_topics: bool = False) -> dict:
    result = {
        "id": p.id,
        "subject": p.subject,
        "description": p.description,
        "difficulty": p.difficulty,
        "progress": p.progress,
        "created_at": p.created_at.isoformat(),
    }
    if include_topics:
        result["topics"] = [_topic_dict(t) for t in sorted(p.topics, key=lambda t: t.order)]
    return result


def _topic_dict(t: StudyTopic) -> dict:
    return {
        "id": t.id,
        "path_id": t.path_id,
        "title": t.title,
        "order": t.order,
        "mastery_level": t.mastery_level,
        "notes": t.notes,
        "feynman_explanation": t.feynman_explanation,
        "created_at": t.created_at.isoformat(),
    }


# ── Study Paths ──

@router.get("/paths")
async def list_paths(db: AsyncSession = Depends(get_db)):
    """List all study paths."""
    result = await db.execute(
        select(StudyPath).order_by(desc(StudyPath.created_at))
    )
    paths = result.scalars().all()
    return [_path_dict(p) for p in paths]


@router.post("/paths")
async def create_path(data: PathCreate, db: AsyncSession = Depends(get_db)):
    """Create a new study path."""
    path = StudyPath(
        subject=data.subject,
        description=data.description,
        difficulty=data.difficulty,
    )
    db.add(path)
    await db.flush()
    return _path_dict(path)


@router.get("/paths/{path_id}")
async def get_path(path_id: int, db: AsyncSession = Depends(get_db)):
    """Get a study path with its topics."""
    result = await db.execute(
        select(StudyPath)
        .where(StudyPath.id == path_id)
        .options(selectinload(StudyPath.topics))
    )
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="Study path not found")
    return _path_dict(path, include_topics=True)


@router.put("/paths/{path_id}")
async def update_path(
    path_id: int,
    data: PathUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a study path."""
    result = await db.execute(select(StudyPath).where(StudyPath.id == path_id))
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="Study path not found")

    updates = data.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(path, key, value)

    await db.flush()
    return _path_dict(path)


@router.delete("/paths/{path_id}")
async def delete_path(path_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a study path and its topics."""
    result = await db.execute(select(StudyPath).where(StudyPath.id == path_id))
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="Study path not found")

    await db.delete(path)
    await db.flush()
    return {"deleted": True, "id": path_id}


# ── Topics ──

@router.post("/paths/{path_id}/topics")
async def add_topic(
    path_id: int,
    data: TopicCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a topic to a study path."""
    result = await db.execute(select(StudyPath).where(StudyPath.id == path_id))
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="Study path not found")

    topic = StudyTopic(
        path_id=path_id,
        title=data.title,
        order=data.order,
    )
    db.add(topic)
    await db.flush()
    return _topic_dict(topic)


@router.put("/topics/{topic_id}")
async def update_topic(
    topic_id: int,
    data: TopicUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a topic (mastery level, notes, etc.)."""
    result = await db.execute(
        select(StudyTopic).where(StudyTopic.id == topic_id)
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    updates = data.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(topic, key, value)

    # Recalculate path progress based on mastery levels
    result = await db.execute(
        select(StudyTopic).where(StudyTopic.path_id == topic.path_id)
    )
    all_topics = result.scalars().all()
    if all_topics:
        mastery_weights = {
            "not_started": 0.0,
            "learning": 0.25,
            "practicing": 0.5,
            "confident": 0.75,
            "mastered": 1.0,
        }
        total_progress = sum(
            mastery_weights.get(t.mastery_level, 0.0) for t in all_topics
        )
        path_result = await db.execute(
            select(StudyPath).where(StudyPath.id == topic.path_id)
        )
        path = path_result.scalar_one_or_none()
        if path:
            path.progress = round((total_progress / len(all_topics)) * 100, 1)

    await db.flush()
    return _topic_dict(topic)


@router.delete("/topics/{topic_id}")
async def delete_topic(topic_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a topic."""
    result = await db.execute(
        select(StudyTopic).where(StudyTopic.id == topic_id)
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    await db.delete(topic)
    await db.flush()
    return {"deleted": True, "id": topic_id}
