"""Action handlers — execute automation tasks triggered by webhook events."""

import logging
from typing import Any, Callable, Coroutine

from webhooks.models import Event
from webhooks.telegram import send_message

logger = logging.getLogger(__name__)

# Type alias for action handlers
ActionHandler = Callable[[Event, dict], Coroutine[Any, Any, str]]


# ── GitHub Helpers ────────────────────────────────────────────────────────────

def _format_pr_merged(event: Event) -> str:
    pr = event.payload.get("pull_request", {})
    repo = event.meta.get("repo", "unknown")
    title = pr.get("title", "Untitled")
    number = pr.get("number", "?")
    author = pr.get("user", {}).get("login", "unknown")
    additions = pr.get("additions", 0)
    deletions = pr.get("deletions", 0)
    changed_files = pr.get("changed_files", 0)
    url = pr.get("html_url", "")
    body = (pr.get("body") or "")[:200]

    return (
        f"*PR Merged* #{number}\n"
        f"*{title}*\n"
        f"Repo: `{repo}`\n"
        f"Author: {author}\n"
        f"Changes: +{additions} -{deletions} ({changed_files} files)\n"
        f"{f'Summary: {body}...' if body else ''}\n"
        f"[View PR]({url})"
    )


def _format_pr_opened(event: Event) -> str:
    pr = event.payload.get("pull_request", {})
    repo = event.meta.get("repo", "unknown")
    title = pr.get("title", "Untitled")
    number = pr.get("number", "?")
    author = pr.get("user", {}).get("login", "unknown")
    url = pr.get("html_url", "")
    body = (pr.get("body") or "")[:200]

    return (
        f"*New PR* #{number}\n"
        f"*{title}*\n"
        f"Repo: `{repo}` | Author: {author}\n"
        f"{f'Description: {body}...' if body else ''}\n"
        f"[View PR]({url})"
    )


def _format_issue_opened(event: Event) -> str:
    issue = event.payload.get("issue", {})
    repo = event.meta.get("repo", "unknown")
    title = issue.get("title", "Untitled")
    number = issue.get("number", "?")
    author = issue.get("user", {}).get("login", "unknown")
    url = issue.get("html_url", "")
    body = (issue.get("body") or "")[:200]

    return (
        f"*New Issue* #{number}\n"
        f"*{title}*\n"
        f"Repo: `{repo}` | Author: {author}\n"
        f"{f'Description: {body}...' if body else ''}\n"
        f"[View Issue]({url})"
    )


def _format_push_main(event: Event) -> str:
    repo = event.meta.get("repo", "unknown")
    pusher = event.payload.get("pusher", {}).get("name", "unknown")
    commits = event.payload.get("commits", [])
    compare_url = event.payload.get("compare", "")

    commit_lines = []
    for c in commits[:5]:
        sha = c.get("id", "")[:7]
        msg = c.get("message", "").split("\n")[0][:60]
        commit_lines.append(f"  `{sha}` {msg}")

    overflow = f"\n  ...and {len(commits) - 5} more" if len(commits) > 5 else ""

    return (
        f"*Push to main*\n"
        f"Repo: `{repo}` | By: {pusher}\n"
        f"Commits ({len(commits)}):\n"
        + "\n".join(commit_lines)
        + overflow
        + (f"\n[Compare]({compare_url})" if compare_url else "")
    )


_GITHUB_FORMATTERS = {
    "pr_merged": _format_pr_merged,
    "pr_opened": _format_pr_opened,
    "issue_opened": _format_issue_opened,
    "push_main": _format_push_main,
}


# ── Action: summarize_and_notify ──────────────────────────────────────────────

async def summarize_and_notify(event: Event, config: dict) -> str:
    """Format a rich summary and send to Telegram."""
    template = config.get("template", "")
    formatter = _GITHUB_FORMATTERS.get(template)

    if formatter:
        message = formatter(event)
    else:
        # Fallback: generic summary
        message = (
            f"*Webhook Event*\n"
            f"Source: {event.source}/{event.event_type}\n"
            f"Meta: {event.meta}"
        )

    success = await send_message(message)
    return "sent" if success else "send_failed"


# ── Action: notify ────────────────────────────────────────────────────────────

async def notify(event: Event, config: dict) -> str:
    """Send a formatted notification to Telegram."""
    template = config.get("template", "")
    formatter = _GITHUB_FORMATTERS.get(template)

    if formatter:
        message = formatter(event)
    else:
        message = (
            f"*{event.source}* — {event.event_type}\n"
            f"Action: {event.meta.get('action', 'N/A')}\n"
            f"Repo: {event.meta.get('repo', 'N/A')}"
        )

    success = await send_message(message)
    return "sent" if success else "send_failed"


# ── Action: meeting_prep ──────────────────────────────────────────────────────

async def meeting_prep(event: Event, config: dict) -> str:
    """Generate a meeting preparation brief and send to Telegram."""
    payload = event.payload
    summary = payload.get("summary", "Meeting")
    start = payload.get("start", {}).get("dateTime", "TBD")
    attendees = payload.get("attendees", [])
    description = (payload.get("description") or "")[:300]

    attendee_list = ", ".join(
        a.get("email", "unknown") for a in attendees[:5]
    ) if attendees else "None listed"

    message = (
        f"*Meeting Prep*\n"
        f"*{summary}*\n"
        f"When: {start}\n"
        f"Attendees: {attendee_list}\n"
        f"{f'Notes: {description}' if description else ''}\n\n"
        f"_Prepare any relevant context or documents._"
    )

    success = await send_message(message)
    return "sent" if success else "send_failed"


# ── Action: generic_notify ────────────────────────────────────────────────────

async def generic_notify(event: Event, config: dict) -> str:
    """Send a generic notification for custom webhooks."""
    channel = event.meta.get("channel", "unknown")
    title = config.get("title", f"Webhook: {channel}")
    fields = config.get("fields", [])

    lines = [f"*{title}*"]
    for field in fields:
        key = field.get("key", "")
        value = event.payload
        for part in key.split("."):
            if isinstance(value, dict):
                value = value.get(part, "")
            else:
                value = ""
                break
        lines.append(f"{field.get('label', key)}: {value}")

    if not fields:
        # Show top-level keys if no fields configured
        for k, v in list(event.payload.items())[:5]:
            display = str(v)[:100] if not isinstance(v, (dict, list)) else f"({type(v).__name__})"
            lines.append(f"{k}: {display}")

    message = "\n".join(lines)
    success = await send_message(message)
    return "sent" if success else "send_failed"


# ── Action Registry ───────────────────────────────────────────────────────────

ACTION_REGISTRY: dict[str, ActionHandler] = {
    "summarize_and_notify": summarize_and_notify,
    "notify": notify,
    "meeting_prep": meeting_prep,
    "generic_notify": generic_notify,
}
