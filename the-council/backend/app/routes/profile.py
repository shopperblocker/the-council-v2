"""
Profile API: Editable user profile management.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.profile import ProfileService

router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileUpdate(BaseModel):
    name: str | None = None
    age: int | None = None
    location: str | None = None
    origin: str | None = None
    school: str | None = None
    major: str | None = None
    year: str | None = None
    north_star: str | None = None
    core_fear: str | None = None
    war_fronts: dict | None = None
    tuition_target: float | None = None
    tuition_deadline: str | None = None
    budget_notes: str | None = None
    psychological_framework: dict | None = None
    what_works: list[str] | None = None
    constraints: list[str] | None = None
    custom_sections: dict | None = None


@router.get("")
async def get_profile(db: AsyncSession = Depends(get_db)):
    """Get the user profile."""
    service = ProfileService(db)
    profile = await service.get_or_create()
    return {
        "id": profile.id,
        "name": profile.name,
        "age": profile.age,
        "location": profile.location,
        "origin": profile.origin,
        "school": profile.school,
        "major": profile.major,
        "year": profile.year,
        "north_star": profile.north_star,
        "core_fear": profile.core_fear,
        "war_fronts": profile.war_fronts,
        "tuition_target": profile.tuition_target,
        "tuition_deadline": profile.tuition_deadline,
        "budget_notes": profile.budget_notes,
        "psychological_framework": profile.psychological_framework,
        "what_works": profile.what_works,
        "constraints": profile.constraints,
        "custom_sections": profile.custom_sections,
        "updated_at": profile.updated_at.isoformat(),
    }


@router.put("")
async def update_profile(data: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    """Update the user profile (partial update — only provided fields are changed)."""
    service = ProfileService(db)
    updates = data.model_dump(exclude_none=True)
    profile = await service.update(updates)
    return {
        "id": profile.id,
        "name": profile.name,
        "age": profile.age,
        "location": profile.location,
        "origin": profile.origin,
        "school": profile.school,
        "major": profile.major,
        "year": profile.year,
        "north_star": profile.north_star,
        "core_fear": profile.core_fear,
        "war_fronts": profile.war_fronts,
        "tuition_target": profile.tuition_target,
        "tuition_deadline": profile.tuition_deadline,
        "budget_notes": profile.budget_notes,
        "psychological_framework": profile.psychological_framework,
        "what_works": profile.what_works,
        "constraints": profile.constraints,
        "custom_sections": profile.custom_sections,
        "updated_at": profile.updated_at.isoformat(),
    }


@router.get("/dossier")
async def get_dossier(db: AsyncSession = Depends(get_db)):
    """Preview the rendered dossier string that agents see."""
    service = ProfileService(db)
    dossier = await service.to_dossier_string()
    return {"dossier": dossier}
