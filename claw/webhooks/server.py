"""FastAPI webhook receiver — accepts POST requests from external systems."""

import hashlib
import hmac
import json
import logging
import os
from datetime import datetime, timezone

from fastapi import FastAPI, Header, HTTPException, Request

from webhooks.dispatcher import dispatch_event
from webhooks.database import get_rules, init_db, add_rule, toggle_rule, delete_rule
from webhooks.models import Event, WebhookRule

logger = logging.getLogger(__name__)

app = FastAPI(title="Claw Webhook Server", version="1.0.0")

# ── Secrets ───────────────────────────────────────────────────────────────────

GITHUB_WEBHOOK_SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "")
GCAL_WEBHOOK_SECRET = os.environ.get("GCAL_WEBHOOK_SECRET", "")
GENERIC_WEBHOOK_SECRET = os.environ.get("GENERIC_WEBHOOK_SECRET", "")


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    init_db()
    logger.info("Webhook server started, database initialized")


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "claw-webhooks"}


# ── GitHub Webhook ────────────────────────────────────────────────────────────

@app.post("/webhooks/github")
async def github_webhook(
    request: Request,
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256"),
    x_github_event: str = Header(None, alias="X-GitHub-Event"),
):
    body = await request.body()

    # Validate signature if secret is configured
    if GITHUB_WEBHOOK_SECRET:
        if not x_hub_signature_256:
            raise HTTPException(status_code=401, detail="Missing signature")
        expected = "sha256=" + hmac.new(
            GITHUB_WEBHOOK_SECRET.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, x_hub_signature_256):
            raise HTTPException(status_code=401, detail="Invalid signature")

    payload = json.loads(body)
    event_type = x_github_event or "unknown"

    # Extract common metadata
    meta = {
        "action": payload.get("action", ""),
        "sender": payload.get("sender", {}).get("login", ""),
        "repo": payload.get("repository", {}).get("full_name", ""),
    }

    event = Event(
        source="github",
        event_type=event_type,
        payload=payload,
        meta=meta,
    )

    result = await dispatch_event(event)
    return {"status": "processed", "matched_rules": result["matched_rules"]}


# ── Google Calendar Webhook ───────────────────────────────────────────────────

@app.post("/webhooks/gcal")
async def gcal_webhook(
    request: Request,
    x_goog_resource_state: str = Header(None, alias="X-Goog-Resource-State"),
    x_goog_channel_id: str = Header(None, alias="X-Goog-Channel-ID"),
    x_goog_channel_token: str = Header(None, alias="X-Goog-Channel-Token"),
):
    # Validate token if secret is configured
    if GCAL_WEBHOOK_SECRET and x_goog_channel_token != GCAL_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid channel token")

    # Google sends empty body for sync messages
    body = await request.body()
    payload = json.loads(body) if body else {}

    resource_state = x_goog_resource_state or "unknown"

    # Ignore sync validation requests
    if resource_state == "sync":
        return {"status": "sync_acknowledged"}

    meta = {
        "resource_state": resource_state,
        "channel_id": x_goog_channel_id or "",
    }

    event = Event(
        source="gcal",
        event_type="calendar_event",
        payload=payload,
        meta=meta,
    )

    result = await dispatch_event(event)
    return {"status": "processed", "matched_rules": result["matched_rules"]}


# ── Generic Webhook ───────────────────────────────────────────────────────────

@app.post("/webhooks/generic/{channel}")
async def generic_webhook(
    channel: str,
    request: Request,
    x_webhook_secret: str = Header(None, alias="X-Webhook-Secret"),
):
    # Validate secret if configured
    if GENERIC_WEBHOOK_SECRET and x_webhook_secret != GENERIC_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    body = await request.body()
    payload = json.loads(body) if body else {}

    meta = {"channel": channel}

    event = Event(
        source="generic",
        event_type=channel,
        payload=payload,
        meta=meta,
    )

    result = await dispatch_event(event)
    return {"status": "processed", "matched_rules": result["matched_rules"]}


# ── Rules management API ─────────────────────────────────────────────────────

@app.get("/rules")
async def list_rules(source: str = None, event_type: str = None):
    rules = get_rules(source=source, event_type=event_type)
    return {"rules": [r.to_dict() for r in rules]}


@app.post("/rules")
async def create_rule(request: Request):
    data = await request.json()
    rule = WebhookRule(
        name=data["name"],
        source=data["source"],
        event_type=data["event_type"],
        condition=data.get("condition", ""),
        action=data["action"],
        action_config=data.get("action_config", {}),
        enabled=data.get("enabled", True),
    )
    rule_id = add_rule(rule)
    return {"id": rule_id, "status": "created"}


@app.patch("/rules/{rule_id}")
async def update_rule(rule_id: int, request: Request):
    data = await request.json()
    if "enabled" in data:
        found = toggle_rule(rule_id, data["enabled"])
        if not found:
            raise HTTPException(status_code=404, detail="Rule not found")
    return {"status": "updated"}


@app.delete("/rules/{rule_id}")
async def remove_rule(rule_id: int):
    found = delete_rule(rule_id)
    if not found:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"status": "deleted"}
