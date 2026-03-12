"""Telegram delivery — send notifications via the Claw bot."""

import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
NOTIFY_CHAT_ID = os.environ.get("ALLOWED_CHAT_IDS", "").split(",")[0].strip()

_API_BASE = "https://api.telegram.org/bot{token}"


async def send_message(
    text: str,
    chat_id: Optional[str] = None,
    parse_mode: str = "Markdown",
) -> bool:
    """Send a Telegram message. Returns True on success."""
    target = chat_id or NOTIFY_CHAT_ID
    if not target:
        logger.error("No chat_id configured for Telegram delivery")
        return False
    if not BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN not set")
        return False

    url = f"{_API_BASE.format(token=BOT_TOKEN)}/sendMessage"
    payload = {
        "chat_id": target,
        "text": text,
        "parse_mode": parse_mode,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                logger.error("Telegram API error: %s %s", resp.status_code, resp.text)
                return False
            return True
    except Exception as e:
        logger.exception("Failed to send Telegram message: %s", e)
        return False
