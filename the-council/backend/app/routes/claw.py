"""
Claw API: Orchestrator task visibility for The Council dashboard.

Exposes Claw agent task data so the frontend can display running/completed
tasks without needing direct access to the Claw Telegram bot.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import ClawTask

router = APIRouter(prefix="/api/claw", tags=["claw"])


class ClawTaskIn(BaseModel):
    """Upsert payload — sent by Claw's sync_to_postgres."""
    id: str
    description: str
    project: str
    status: str = "running"
    agent: str = "claude-code"
    task_type: str = "general"
    branch: Optional[str] = None
    pr_number: Optional[int] = None
    failure_reason: Optional[str] = None
    retry_count: int = 0
    notes: str = ""
    started_at: str
    completed_at: Optional[str] = None


def _serialize(t: ClawTask) -> dict:
    return {
        "id": t.id,
        "description": t.description,
        "project": t.project,
        "status": t.status,
        "agent": t.agent,
        "task_type": t.task_type,
        "branch": t.branch,
        "pr_number": t.pr_number,
        "failure_reason": t.failure_reason,
        "retry_count": t.retry_count,
        "notes": t.notes,
        "started_at": t.started_at,
        "completed_at": t.completed_at,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


@router.get("/tasks")
async def list_tasks(
    status: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List Claw tasks, optionally filtered by status."""
    query = select(ClawTask)
    if status:
        query = query.where(ClawTask.status == status)
    query = query.order_by(ClawTask.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return [_serialize(t) for t in result.scalars().all()]


@router.get("/tasks/{task_id}")
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single Claw task by ID."""
    result = await db.execute(select(ClawTask).where(ClawTask.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _serialize(task)


@router.get("/summary")
async def task_summary(db: AsyncSession = Depends(get_db)):
    """Quick summary of task counts by status — for dashboard badges."""
    result = await db.execute(select(ClawTask))
    tasks = result.scalars().all()
    counts = {"running": 0, "done": 0, "blocked": 0, "killed": 0}
    for t in tasks:
        if t.status in counts:
            counts[t.status] += 1
    return {
        "total": len(tasks),
        **counts,
    }


@router.post("/tasks/sync")
async def sync_task(body: ClawTaskIn, db: AsyncSession = Depends(get_db)):
    """Upsert a Claw task — called by Claw's sync_to_postgres."""
    result = await db.execute(select(ClawTask).where(ClawTask.id == body.id))
    task = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)

    if task:
        # Update existing
        task.description = body.description
        task.project = body.project
        task.status = body.status
        task.agent = body.agent
        task.task_type = body.task_type
        task.branch = body.branch
        task.pr_number = body.pr_number
        task.failure_reason = body.failure_reason
        task.retry_count = body.retry_count
        task.notes = body.notes
        task.completed_at = body.completed_at
        task.updated_at = now
    else:
        # Create new
        task = ClawTask(
            id=body.id,
            description=body.description,
            project=body.project,
            status=body.status,
            agent=body.agent,
            task_type=body.task_type,
            branch=body.branch,
            pr_number=body.pr_number,
            failure_reason=body.failure_reason,
            retry_count=body.retry_count,
            notes=body.notes,
            started_at=body.started_at,
            completed_at=body.completed_at,
            created_at=now,
            updated_at=now,
        )
        db.add(task)

    await db.flush()
    return _serialize(task)
