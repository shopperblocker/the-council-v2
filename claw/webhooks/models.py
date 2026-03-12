"""Webhook event model — normalized structure for all incoming webhook events."""

from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class Event:
    """Normalized webhook event."""

    source: str          # "github", "gcal", "generic"
    event_type: str      # "pull_request", "push", "issues", "calendar_event", etc.
    payload: dict        # Raw payload from the source
    timestamp: str = ""  # ISO-8601
    meta: dict = field(default_factory=dict)  # Extracted metadata

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()


@dataclass
class WebhookRule:
    """A rule that maps an event to an action."""

    id: int = 0
    name: str = ""
    source: str = ""          # "github", "gcal", "generic"
    event_type: str = ""      # "pull_request", "push", "issues", etc.
    condition: str = ""       # Python expression evaluated against event
    action: str = ""          # Handler name, e.g. "summarize_and_notify"
    action_config: dict = field(default_factory=dict)  # JSON config for the action
    enabled: bool = True

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "source": self.source,
            "event_type": self.event_type,
            "condition": self.condition,
            "action": self.action,
            "action_config": self.action_config,
            "enabled": self.enabled,
        }

    @classmethod
    def from_row(cls, row: dict) -> "WebhookRule":
        import json
        config = row.get("action_config", "{}")
        if isinstance(config, str):
            config = json.loads(config) if config else {}
        return cls(
            id=row["id"],
            name=row["name"],
            source=row["source"],
            event_type=row["event_type"],
            condition=row.get("condition", ""),
            action=row["action"],
            action_config=config,
            enabled=bool(row.get("enabled", 1)),
        )
