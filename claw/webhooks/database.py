"""SQLite database layer for webhook rules and event logs."""

import json
import logging
import sqlite3
from pathlib import Path
from typing import Optional

from webhooks.models import WebhookRule

logger = logging.getLogger(__name__)

DB_PATH = Path.home() / ".claw" / "webhooks.db"

# ── Schema ────────────────────────────────────────────────────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS webhook_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    event_type TEXT NOT NULL,
    condition TEXT DEFAULT '',
    action TEXT NOT NULL,
    action_config TEXT DEFAULT '{}',
    enabled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    meta TEXT DEFAULT '{}',
    received_at TEXT NOT NULL,
    matched_rule_id INTEGER,
    action_result TEXT DEFAULT ''
);
"""

# ── Default rules ─────────────────────────────────────────────────────────────

DEFAULT_RULES = [
    {
        "name": "PR Merged",
        "source": "github",
        "event_type": "pull_request",
        "condition": 'meta.get("action") == "closed" and payload.get("pull_request", {}).get("merged")',
        "action": "summarize_and_notify",
        "action_config": json.dumps({"template": "pr_merged"}),
    },
    {
        "name": "PR Opened",
        "source": "github",
        "event_type": "pull_request",
        "condition": 'meta.get("action") == "opened"',
        "action": "notify",
        "action_config": json.dumps({"template": "pr_opened"}),
    },
    {
        "name": "Issue Opened",
        "source": "github",
        "event_type": "issues",
        "condition": 'meta.get("action") == "opened"',
        "action": "notify",
        "action_config": json.dumps({"template": "issue_opened"}),
    },
    {
        "name": "Push to Main",
        "source": "github",
        "event_type": "push",
        "condition": 'payload.get("ref") == "refs/heads/main"',
        "action": "summarize_and_notify",
        "action_config": json.dumps({"template": "push_main"}),
    },
    {
        "name": "Calendar Event",
        "source": "gcal",
        "event_type": "calendar_event",
        "condition": "",
        "action": "meeting_prep",
        "action_config": json.dumps({}),
    },
]

# ── Connection ────────────────────────────────────────────────────────────────


def _get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables and seed default rules if empty."""
    conn = _get_conn()
    try:
        conn.executescript(_SCHEMA)
        count = conn.execute("SELECT COUNT(*) FROM webhook_rules").fetchone()[0]
        if count == 0:
            for rule in DEFAULT_RULES:
                conn.execute(
                    "INSERT INTO webhook_rules (name, source, event_type, condition, action, action_config) "
                    "VALUES (:name, :source, :event_type, :condition, :action, :action_config)",
                    rule,
                )
            conn.commit()
            logger.info("Seeded %d default webhook rules", len(DEFAULT_RULES))
        conn.commit()
    finally:
        conn.close()


# ── Rules CRUD ────────────────────────────────────────────────────────────────


def get_rules(source: Optional[str] = None, event_type: Optional[str] = None) -> list[WebhookRule]:
    """Fetch enabled rules, optionally filtered by source and event_type."""
    conn = _get_conn()
    try:
        query = "SELECT * FROM webhook_rules WHERE enabled = 1"
        params: list = []
        if source:
            query += " AND source = ?"
            params.append(source)
        if event_type:
            query += " AND event_type = ?"
            params.append(event_type)
        rows = conn.execute(query, params).fetchall()
        return [WebhookRule.from_row(dict(r)) for r in rows]
    finally:
        conn.close()


def add_rule(rule: WebhookRule) -> int:
    """Insert a new rule. Returns the new row ID."""
    conn = _get_conn()
    try:
        cur = conn.execute(
            "INSERT INTO webhook_rules (name, source, event_type, condition, action, action_config, enabled) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (rule.name, rule.source, rule.event_type, rule.condition,
             rule.action, json.dumps(rule.action_config), int(rule.enabled)),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def toggle_rule(rule_id: int, enabled: bool) -> bool:
    """Enable or disable a rule. Returns True if rule was found."""
    conn = _get_conn()
    try:
        cur = conn.execute(
            "UPDATE webhook_rules SET enabled = ? WHERE id = ?",
            (int(enabled), rule_id),
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def delete_rule(rule_id: int) -> bool:
    """Delete a rule. Returns True if rule was found."""
    conn = _get_conn()
    try:
        cur = conn.execute("DELETE FROM webhook_rules WHERE id = ?", (rule_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


# ── Event log ─────────────────────────────────────────────────────────────────


def log_event(
    source: str,
    event_type: str,
    payload: dict,
    meta: dict,
    received_at: str,
    matched_rule_id: Optional[int] = None,
    action_result: str = "",
) -> int:
    """Log a received webhook event. Returns the new row ID."""
    conn = _get_conn()
    try:
        cur = conn.execute(
            "INSERT INTO webhook_events (source, event_type, payload, meta, received_at, matched_rule_id, action_result) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (source, event_type, json.dumps(payload), json.dumps(meta),
             received_at, matched_rule_id, action_result),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()
