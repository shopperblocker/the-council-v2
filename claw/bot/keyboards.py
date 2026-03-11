"""Inline keyboards for Claw Telegram bot."""

from telegram import InlineKeyboardButton, InlineKeyboardMarkup


def build_task_keyboard(task_id: str) -> InlineKeyboardMarkup:
    """Keyboard for a blocked/running task — Retry, Kill, Add Context."""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🔄 Retry", callback_data=f"retry:{task_id}"),
            InlineKeyboardButton("💀 Kill", callback_data=f"kill:{task_id}"),
        ],
        [
            InlineKeyboardButton("📝 Add Context", callback_data=f"context:{task_id}"),
        ],
    ])


def build_project_selector(projects: dict[str, dict]) -> InlineKeyboardMarkup:
    """Inline keyboard listing available projects."""
    buttons = [
        [InlineKeyboardButton(v["name"], callback_data=f"project:{k}")]
        for k, v in projects.items()
    ]
    return InlineKeyboardMarkup(buttons)
