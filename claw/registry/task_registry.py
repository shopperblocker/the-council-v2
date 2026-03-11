"""
Task Registry: JSON-backed store for Claw tasks.

Uses fcntl file locking (Unix) and atomic rename for safe concurrent access.
Falls back gracefully on Windows (no fcntl).

Backing store: ~/.claw/active-tasks.json
"""

import json
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from registry.models import TaskRecord

STORE_PATH = Path.home() / ".claw" / "active-tasks.json"
ARCHIVE_PATH = Path.home() / ".claw" / "archived-tasks.json"


def _lock(f):
    """Acquire an exclusive fcntl lock (Unix only). No-op on Windows."""
    if sys.platform != "win32":
        import fcntl
        fcntl.flock(f, fcntl.LOCK_EX)


def _unlock(f):
    if sys.platform != "win32":
        import fcntl
        fcntl.flock(f, fcntl.LOCK_UN)


def _load_store(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def _save_store(path: Path, data: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Atomic write via tmp file + rename
    fd, tmp_path = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            _lock(f)
            json.dump(data, f, indent=2)
            _unlock(f)
        shutil.move(tmp_path, str(path))
    except Exception:
        os.unlink(tmp_path)
        raise


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_task(task: TaskRecord) -> TaskRecord:
    """Persist a new task to the registry and sync to Council."""
    tasks = _load_store(STORE_PATH)
    tasks.append(task.to_dict())
    _save_store(STORE_PATH, tasks)
    sync_to_council(task)
    return task


def get_task(task_id: str) -> Optional[TaskRecord]:
    """Retrieve a task by ID."""
    tasks = _load_store(STORE_PATH)
    for t in tasks:
        if t["id"] == task_id:
            return TaskRecord.from_dict(t)
    return None


def update_task(task_id: str, **updates) -> Optional[TaskRecord]:
    """Update fields on an existing task and sync to Council."""
    tasks = _load_store(STORE_PATH)
    updated = None
    for i, t in enumerate(tasks):
        if t["id"] == task_id:
            t.update(updates)
            updated = TaskRecord.from_dict(t)
            tasks[i] = t
            break
    if updated:
        _save_store(STORE_PATH, tasks)
        sync_to_council(updated)
    return updated


def list_tasks(status: Optional[str] = None) -> list[TaskRecord]:
    """List all tasks, optionally filtered by status."""
    tasks = _load_store(STORE_PATH)
    records = [TaskRecord.from_dict(t) for t in tasks]
    if status:
        records = [r for r in records if r.status == status]
    return records


def archive_completed_tasks() -> int:
    """Move done/killed tasks to archive. Returns count archived."""
    tasks = _load_store(STORE_PATH)
    active = [t for t in tasks if t["status"] in ("running", "blocked")]
    done = [t for t in tasks if t["status"] not in ("running", "blocked")]

    if not done:
        return 0

    archived = _load_store(ARCHIVE_PATH)
    archived.extend(done)
    _save_store(ARCHIVE_PATH, archived)
    _save_store(STORE_PATH, active)
    return len(done)


def sync_to_council(task: TaskRecord) -> bool:
    """Sync task to The Council backend via its REST API.

    Uses COUNCIL_API_URL env var (e.g. https://your-app.railway.app/api).
    Falls back to DATABASE_URL direct psycopg2 if API is unreachable.
    """
    import logging
    import urllib.request
    import urllib.error

    logger = logging.getLogger(__name__)

    api_url = os.environ.get("COUNCIL_API_URL")
    if not api_url:
        # Fallback: try direct DB sync if DATABASE_URL is set
        return _sync_to_postgres_direct(task)

    try:
        payload = json.dumps(task.to_dict()).encode("utf-8")
        req = urllib.request.Request(
            f"{api_url}/claw/tasks/sync",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                logger.info("[claw] synced task %s to Council API", task.id)
                return True
    except Exception as e:
        logger.warning("[claw] Council API sync failed: %s", e)

    # Fallback to direct DB
    return _sync_to_postgres_direct(task)


def _sync_to_postgres_direct(task: TaskRecord) -> bool:
    """Direct PostgreSQL upsert fallback — used when Council API is unavailable."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return False

    try:
        import psycopg2
    except ImportError:
        return False

    try:
        url = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("postgres://", "postgresql://")
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO claw_tasks (id, description, project, status, agent, task_type,
                                    branch, pr_number, failure_reason, retry_count, notes,
                                    started_at, completed_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                failure_reason = EXCLUDED.failure_reason,
                retry_count = EXCLUDED.retry_count,
                completed_at = EXCLUDED.completed_at,
                notes = EXCLUDED.notes,
                branch = EXCLUDED.branch,
                pr_number = EXCLUDED.pr_number,
                updated_at = NOW()
        """, (
            task.id, task.description, task.project, task.status,
            task.agent, task.task_type, task.branch, task.pr_number,
            task.failure_reason, task.retry_count, task.notes,
            task.started_at, task.completed_at,
        ))

        conn.commit()
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"[claw] postgres direct sync failed: {e}")
        return False
