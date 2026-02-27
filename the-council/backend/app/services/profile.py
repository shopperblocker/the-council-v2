"""
Profile Service: Dynamic user profile management.

Replaces the hardcoded USER_DOSSIER with a DB-backed, editable profile.
"""

from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UserProfile


class ProfileService:
    """Manages the user's editable profile."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create(self) -> UserProfile:
        """Get the user profile, creating with defaults if it doesn't exist."""
        result = await self.db.execute(select(UserProfile).limit(1))
        profile = result.scalar_one_or_none()

        if profile is None:
            profile = UserProfile(
                name="Kyle Kivuvani",
                age=19,
                location="Washington, DC",
                origin="Kenya",
                school="Howard University",
                major="International Business",
                year="Freshman",
                north_star='Refuses to waste his potential: "Being average when I was given brilliance is not just lazy — it\'s betrayal."',
                core_fear="The thought of my mom dying ashamed of me disgusts me.",
                war_fronts={
                    "The Council App": "Building this agentic AI system (his technical showcase).",
                    "Math Placement Test": "Immediate academic bottleneck for degree path.",
                    "Business": "AI consultancy, dropshipping experiments (target: 1.5 ROAS minimum).",
                    "Financial": "Dependent on father for budget. Must justify every dollar.",
                },
                tuition_target=30000.0,
                tuition_deadline="August 2025",
                budget_notes="Every dollar matters. Seeking scholarships.",
                psychological_framework={
                    "The Icarus Complex": "Tendency to fly too high (hubris, fantasy) or refuse to land (procrastination).",
                    "The Solution": "Somatic anchoring — physical tasks and boring admin to ground the ego.",
                    "The Golden Mean": "Currently fighting imbalances in confidence, spending, ambition, and anger.",
                    "Weekly check": "What did I FINISH? Not what did I start.",
                },
                what_works=[
                    "Direct, numbers-driven advice (not vague encouragement).",
                    "Challenge him — he respects people who push back.",
                    "Connect advice to his specific situation (not generic platitudes).",
                    "Hold him accountable to what he said he'd do.",
                ],
                constraints=[
                    "Time-limited: balancing school + business + self-improvement.",
                    "Budget-conscious: every dollar matters.",
                    "In DC: access to political/business networks but high cost of living.",
                ],
                custom_sections={},
            )
            self.db.add(profile)
            await self.db.flush()

        return profile

    async def update(self, updates: dict) -> UserProfile:
        """Update profile fields. Only updates provided keys."""
        profile = await self.get_or_create()

        for key, value in updates.items():
            if hasattr(profile, key) and key not in ("id", "updated_at"):
                setattr(profile, key, value)

        profile.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        return profile

    async def to_dossier_string(self) -> str:
        """Generate the dossier string for agent prompts from DB profile."""
        p = await self.get_or_create()

        # Build war fronts section
        war_fronts_text = ""
        if p.war_fronts:
            for name, desc in p.war_fronts.items():
                war_fronts_text += f"- **{name}:** {desc}\n"

        # Build what_works section
        what_works_text = ""
        if p.what_works:
            for item in p.what_works:
                what_works_text += f"- {item}\n"

        # Build constraints section
        constraints_text = ""
        if p.constraints:
            for item in p.constraints:
                constraints_text += f"- {item}\n"

        # Build psychological framework
        psych_text = ""
        if p.psychological_framework:
            for key, val in p.psychological_framework.items():
                psych_text += f"- **{key}:** {val}\n"

        # Build custom sections
        custom_text = ""
        if p.custom_sections:
            for section_name, content in p.custom_sections.items():
                custom_text += f"\n### {section_name.upper()}\n{content}\n"

        dossier = f"""## DOSSIER: {p.name.upper()}

### IDENTITY
- {p.age} years old. From {p.origin}. Currently in {p.location}.
- {p.year} at {p.school} — {p.major}.
- Needs ${p.tuition_target:,.0f} tuition by {p.tuition_deadline}. This is the non-negotiable.

### THE NORTH STAR
- {p.north_star}
- Core fear: "{p.core_fear}"

### THE PSYCHOLOGICAL FRAMEWORK
{psych_text}
### CURRENT WAR FRONTS
{war_fronts_text}
### CONSTRAINTS
{constraints_text}
### WHAT WORKS WITH {p.name.split()[0].upper()}
{what_works_text}{custom_text}"""

        return dossier
