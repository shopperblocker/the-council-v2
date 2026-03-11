"""
Claw spawn.py: Launch a Claude Code agent in a tmux session.

Never uses shell=True. Checks tmux availability first.
"""

import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add claw root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from context.project_contexts import find_project
from context.prompt_builder import build_claude_code_prompt, select_agent
from registry.models import TaskRecord
from registry.task_registry import create_task


def _check_tmux() -> None:
    """Raise RuntimeError if tmux is not available."""
    if not shutil.which("tmux"):
        raise RuntimeError("tmux is not installed or not in PATH")


def _make_task_id(description: str) -> str:
    """Generate a task ID: first 4 words of description + timestamp."""
    words = "".join(c if c.isalnum() or c == " " else "" for c in description.lower())
    slug = "-".join(words.split()[:4]) or "task"
    ts = int(datetime.now(timezone.utc).timestamp())
    return f"{slug}-{ts}"


def spawn_agent(
    task_description: str,
    project: str,
    task_type: str = "general",
    relevant_files: list[str] | None = None,
    telegram_chat_id: str | None = None,
    notify_on_complete: bool = True,
) -> TaskRecord:
    """
    Build prompt, create task record, and launch agent in tmux.

    Returns the TaskRecord (status="running").
    Raises RuntimeError if tmux unavailable or project not found.
    """
    _check_tmux()

    project_info = find_project(project)
    if not project_info:
        raise RuntimeError(f"Unknown project: {project!r}. Use /tasks to see known projects.")

    repo_path = project_info.get("repo_path", ".")
    if not Path(repo_path).exists():
        raise RuntimeError(f"Project path does not exist: {repo_path}")

    task_id = _make_task_id(task_description)
    agent = select_agent(task_type)

    prompt = build_claude_code_prompt(
        task_description=task_description,
        project=project,
        relevant_files=relevant_files,
        task_type=task_type,
    )

    # Branch name derived from task_id
    branch = f"claw/{task_id}"

    task = TaskRecord(
        id=task_id,
        description=task_description,
        project=project,
        started_at=datetime.now(timezone.utc).isoformat(),
        status="running",
        agent=agent,
        task_type=task_type,
        notify_on_complete=notify_on_complete,
        telegram_chat_id=telegram_chat_id,
        branch=branch,
    )

    # Persist before launching (so crash doesn't lose the record)
    create_task(task)

    # Launch in tmux (no shell=True)
    session_name = f"claw-{task_id}"
    cmd = [
        "tmux", "new-session", "-d",
        "-s", session_name,
        "-c", repo_path,
        "--",
        "claude",
        "--model", "claude-opus-4-6",
        "--dangerously-skip-permissions",
        "-p", prompt,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        from registry.task_registry import update_task
        update_task(task_id, status="blocked", failure_reason=f"tmux launch failed: {result.stderr[:200]}")
        raise RuntimeError(f"Failed to start tmux session: {result.stderr}")

    return task


def kill_agent(task_id: str) -> bool:
    """Kill the tmux session for a task. Returns True if session existed."""
    result = subprocess.run(
        ["tmux", "kill-session", "-t", f"claw-{task_id}"],
        capture_output=True,
    )
    return result.returncode == 0


def get_tmux_output(task_id: str, lines: int = 50) -> str:
    """Capture recent output from a tmux session."""
    result = subprocess.run(
        ["tmux", "capture-pane", "-pt", f"claw-{task_id}", "-S", f"-{lines}"],
        capture_output=True,
        text=True,
    )
    return result.stdout.strip() if result.returncode == 0 else "(session not found)"
