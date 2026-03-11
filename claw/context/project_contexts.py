"""
Project Contexts: Known projects and their metadata.

Used by prompt_builder.py and spawn.py to route tasks to correct repos.
"""

from pathlib import Path

PROJECTS: dict[str, dict] = {
    "the-council": {
        "name": "The Council",
        "repo_path": str(Path.home() / "the-council-v2"),
        "stack": "Next.js 14 · FastAPI · PostgreSQL · Tailwind · TypeScript",
        "vps_path": None,
        "railway_url": None,  # set from env if needed
        "vercel_url": None,   # set from env if needed
        "context_file": "the-council.md",
    },
    "buddy-ai": {
        "name": "BuddyAI",
        "repo_path": str(Path.home() / "projects" / "buddy-ai"),
        "stack": "React Native · Expo · Claude API",
        "vps_path": None,
        "railway_url": None,
        "vercel_url": None,
        "context_file": "buddy-ai.md",
    },
    "inner-compass": {
        "name": "Inner Compass",
        "repo_path": str(Path.home() / "projects" / "inner-compass"),
        "stack": "Next.js · OpenAI",
        "vps_path": None,
        "railway_url": None,
        "vercel_url": None,
        "context_file": None,
    },
    "claw": {
        "name": "Claw",
        "repo_path": str(Path.home() / "the-council-v2" / "claw"),
        "stack": "Python · python-telegram-bot · tmux",
        "vps_path": None,
        "railway_url": None,
        "vercel_url": None,
        "context_file": None,
    },
}


def find_project(name: str) -> dict | None:
    """Fuzzy project lookup: exact match → startswith → contains."""
    key = name.lower().replace(" ", "-")

    # Exact match
    if key in PROJECTS:
        return PROJECTS[key]

    # Startswith
    for k, v in PROJECTS.items():
        if k.startswith(key) or key.startswith(k):
            return v

    # Contains
    for k, v in PROJECTS.items():
        if key in k or k in key:
            return v

    return None


def list_projects() -> str:
    """Formatted project list for Telegram display."""
    lines = []
    for key, p in PROJECTS.items():
        lines.append(f"  *{p['name']}* (`{key}`) — {p['stack']}")
    return "\n".join(lines)
