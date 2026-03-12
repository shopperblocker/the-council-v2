"""Event dispatcher — routes incoming events to matching action handlers."""

import logging
from typing import Any

from webhooks.database import get_rules, log_event
from webhooks.models import Event, WebhookRule

logger = logging.getLogger(__name__)


def _evaluate_condition(rule: WebhookRule, event: Event) -> bool:
    """Evaluate a rule's condition against an event.

    The condition is a Python expression with access to:
      - meta: event.meta dict
      - payload: event.payload dict
      - source: event.source string
      - event_type: event.event_type string

    Empty conditions always match.
    """
    if not rule.condition.strip():
        return True

    safe_globals = {"__builtins__": {}}
    safe_locals = {
        "meta": event.meta,
        "payload": event.payload,
        "source": event.source,
        "event_type": event.event_type,
    }

    try:
        result = eval(rule.condition, safe_globals, safe_locals)  # noqa: S307
        return bool(result)
    except Exception as e:
        logger.warning("Rule %s (%s) condition error: %s", rule.id, rule.name, e)
        return False


async def dispatch_event(event: Event) -> dict[str, Any]:
    """Dispatch an event to all matching rules and execute their actions.

    Returns a summary of matched rules and action results.
    """
    from webhooks.actions import ACTION_REGISTRY

    rules = get_rules(source=event.source, event_type=event.event_type)
    matched_rules = []

    for rule in rules:
        if not _evaluate_condition(rule, event):
            continue

        logger.info(
            "Rule matched: %s (%s) for %s/%s",
            rule.name, rule.action, event.source, event.event_type,
        )

        handler = ACTION_REGISTRY.get(rule.action)
        if not handler:
            logger.error("Unknown action handler: %s", rule.action)
            action_result = f"error: unknown action {rule.action}"
        else:
            try:
                action_result = await handler(event, rule.action_config)
            except Exception as e:
                logger.exception("Action %s failed: %s", rule.action, e)
                action_result = f"error: {e}"

        # Log the event
        log_event(
            source=event.source,
            event_type=event.event_type,
            payload=event.payload,
            meta=event.meta,
            received_at=event.timestamp,
            matched_rule_id=rule.id,
            action_result=str(action_result),
        )

        matched_rules.append({
            "rule_id": rule.id,
            "rule_name": rule.name,
            "action": rule.action,
            "result": str(action_result),
        })

    # Log unmatched events too (for debugging)
    if not matched_rules:
        log_event(
            source=event.source,
            event_type=event.event_type,
            payload=event.payload,
            meta=event.meta,
            received_at=event.timestamp,
            action_result="no_match",
        )

    return {"matched_rules": matched_rules}
