"""TaskRecord dataclass — the schema for all Claw tasks."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class TaskRecord:
    """A single agent task tracked by Claw."""

    id: str                          # 6-word slug + timestamp, e.g. "brave-ocean-delta-1704067200"
    description: str                 # Human-readable task description
    project: str                     # Project name (fuzzy-matched to PROJECTS dict)
    started_at: str                  # ISO-8601 timestamp
    status: str = "running"          # "running" | "done" | "blocked" | "killed"

    # Agent info
    agent: str = "claude-code"       # "claude-code" | "codex"
    task_type: str = "general"       # "ui" | "backend" | "infra" | "general"

    # Notification
    notify_on_complete: bool = True
    telegram_chat_id: Optional[str] = None

    # GitHub integration
    branch: Optional[str] = None
    pr_number: Optional[int] = None

    # Completion tracking
    completed_at: Optional[str] = None
    failure_reason: Optional[str] = None
    retry_count: int = 0

    # Free-form notes
    notes: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "description": self.description,
            "project": self.project,
            "started_at": self.started_at,
            "status": self.status,
            "agent": self.agent,
            "task_type": self.task_type,
            "notify_on_complete": self.notify_on_complete,
            "telegram_chat_id": self.telegram_chat_id,
            "branch": self.branch,
            "pr_number": self.pr_number,
            "completed_at": self.completed_at,
            "failure_reason": self.failure_reason,
            "retry_count": self.retry_count,
            "notes": self.notes,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "TaskRecord":
        return cls(
            id=data["id"],
            description=data["description"],
            project=data["project"],
            started_at=data["started_at"],
            status=data.get("status", "running"),
            agent=data.get("agent", "claude-code"),
            task_type=data.get("task_type", "general"),
            notify_on_complete=data.get("notify_on_complete", True),
            telegram_chat_id=data.get("telegram_chat_id"),
            branch=data.get("branch"),
            pr_number=data.get("pr_number"),
            completed_at=data.get("completed_at"),
            failure_reason=data.get("failure_reason"),
            retry_count=data.get("retry_count", 0),
            notes=data.get("notes", ""),
        )
