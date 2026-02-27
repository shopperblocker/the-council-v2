"""
Plans Hub Routes: Plans and milestones CRUD.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Plan, Milestone

router = APIRouter(prefix="/api/plans", tags=["plans"])


# ── Request Schemas ──

class PlanCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    target_date: Optional[str] = None


class PlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    target_date: Optional[str] = None
    progress: Optional[float] = None


class MilestoneCreate(BaseModel):
    title: str
    due_date: Optional[str] = None


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None


# ── Helpers ──

def _plan_dict(p: Plan, include_milestones: bool = False) -> dict:
    result = {
        "id": p.id,
        "title": p.title,
        "description": p.description,
        "category": p.category,
        "status": p.status,
        "target_date": p.target_date,
        "progress": p.progress,
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
    }
    if include_milestones:
        result["milestones"] = [_milestone_dict(m) for m in p.milestones]
    return result


def _milestone_dict(m: Milestone) -> dict:
    return {
        "id": m.id,
        "plan_id": m.plan_id,
        "title": m.title,
        "completed": m.completed,
        "due_date": m.due_date,
        "notes": m.notes,
        "completed_at": m.completed_at.isoformat() if m.completed_at else None,
        "created_at": m.created_at.isoformat(),
    }


# ── Plans ──

@router.get("")
async def list_plans(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all plans, optionally filtered by status."""
    query = select(Plan).order_by(desc(Plan.created_at))
    if status:
        query = query.where(Plan.status == status)

    result = await db.execute(query)
    plans = result.scalars().all()
    return [_plan_dict(p) for p in plans]


@router.post("")
async def create_plan(data: PlanCreate, db: AsyncSession = Depends(get_db)):
    """Create a new plan."""
    plan = Plan(
        title=data.title,
        description=data.description,
        category=data.category,
        target_date=data.target_date,
    )
    db.add(plan)
    await db.flush()
    return _plan_dict(plan)


@router.get("/{plan_id}")
async def get_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    """Get a plan with its milestones."""
    result = await db.execute(
        select(Plan)
        .where(Plan.id == plan_id)
        .options(selectinload(Plan.milestones))
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return _plan_dict(plan, include_milestones=True)


@router.put("/{plan_id}")
async def update_plan(
    plan_id: int,
    data: PlanUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a plan."""
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    updates = data.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(plan, key, value)
    plan.updated_at = datetime.now(timezone.utc)

    await db.flush()
    return _plan_dict(plan)


@router.delete("/{plan_id}")
async def delete_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a plan and its milestones."""
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    await db.delete(plan)
    await db.flush()
    return {"deleted": True, "id": plan_id}


# ── Milestones ──

@router.post("/{plan_id}/milestones")
async def add_milestone(
    plan_id: int,
    data: MilestoneCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a milestone to a plan."""
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    milestone = Milestone(
        plan_id=plan_id,
        title=data.title,
        due_date=data.due_date,
    )
    db.add(milestone)
    await db.flush()
    return _milestone_dict(milestone)


@router.put("/{plan_id}/milestones/{milestone_id}")
async def update_milestone(
    plan_id: int,
    milestone_id: int,
    data: MilestoneUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a milestone."""
    result = await db.execute(
        select(Milestone).where(
            Milestone.id == milestone_id,
            Milestone.plan_id == plan_id,
        )
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    updates = data.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(milestone, key, value)

    # Auto-set completed_at when marking as completed
    if data.completed is True and not milestone.completed_at:
        milestone.completed_at = datetime.now(timezone.utc)
    elif data.completed is False:
        milestone.completed_at = None

    # Recalculate plan progress
    result = await db.execute(
        select(Milestone).where(Milestone.plan_id == plan_id)
    )
    all_milestones = result.scalars().all()
    if all_milestones:
        completed_count = sum(1 for m in all_milestones if m.completed)
        plan_result = await db.execute(select(Plan).where(Plan.id == plan_id))
        plan = plan_result.scalar_one_or_none()
        if plan:
            plan.progress = round((completed_count / len(all_milestones)) * 100, 1)
            plan.updated_at = datetime.now(timezone.utc)

    await db.flush()
    return _milestone_dict(milestone)


@router.delete("/{plan_id}/milestones/{milestone_id}")
async def delete_milestone(
    plan_id: int,
    milestone_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a milestone."""
    result = await db.execute(
        select(Milestone).where(
            Milestone.id == milestone_id,
            Milestone.plan_id == plan_id,
        )
    )
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    await db.delete(milestone)
    await db.flush()
    return {"deleted": True, "id": milestone_id}
