"""
Personal Context: Load and update Claw's memory files.
"""

import os
from pathlib import Path
from datetime import datetime, timezone

MEMORY_DIR = Path(__file__).parent.parent / "memory"
MEMORY_FILE = MEMORY_DIR / "MEMORY.md"
PROJECTS_DIR = MEMORY_DIR / "projects"


def load_memory() -> str:
    """Load the main MEMORY.md file."""
    if not MEMORY_FILE.exists():
        return "(no memory file found)"
    return MEMORY_FILE.read_text(encoding="utf-8")


def load_project_context(project: str) -> str:
    """Load a project-specific context file."""
    # Try exact name, then with .md extension
    candidates = [
        PROJECTS_DIR / f"{project}.md",
        PROJECTS_DIR / f"{project.replace('-', '_')}.md",
        PROJECTS_DIR / f"{project.lower()}.md",
    ]
    for path in candidates:
        if path.exists():
            return path.read_text(encoding="utf-8")
    return f"(no context file found for project: {project})"


def append_to_memory(section: str, entry: str) -> None:
    """Append an entry under a section heading in MEMORY.md."""
    content = MEMORY_FILE.read_text(encoding="utf-8") if MEMORY_FILE.exists() else ""

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    new_entry = f"- [{timestamp}] {entry}"

    # Find section and insert after it
    if f"## {section}" in content:
        idx = content.index(f"## {section}") + len(f"## {section}")
        # Skip to end of the section header line
        next_newline = content.index("\n", idx)
        content = content[: next_newline + 1] + new_entry + "\n" + content[next_newline + 1:]
    else:
        # Section doesn't exist — append at end
        content += f"\n## {section}\n{new_entry}\n"

    MEMORY_FILE.write_text(content, encoding="utf-8")


def get_recent_decisions(n: int = 5) -> list[str]:
    """Extract the last N entries from the 'Recent Decisions' section."""
    content = load_memory()
    lines = content.splitlines()
    in_section = False
    decisions = []

    for line in lines:
        if line.startswith("## Recent Decisions"):
            in_section = True
            continue
        if in_section:
            if line.startswith("## "):
                break
            if line.strip().startswith("- "):
                decisions.append(line.strip())

    return decisions[-n:]
