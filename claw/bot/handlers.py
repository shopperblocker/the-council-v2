"""
Claw Telegram Bot Handlers.

Commands:
  /spawn {project} {task_type} | {description}
  /tasks
  /status {task_id}
  /projects

Callback queries:
  retry:{task_id}
  kill:{task_id}
  context:{task_id}
"""

import os
import sys
from pathlib import Path

# Add claw root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from telegram import Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
)

from bot.keyboards import build_task_keyboard
from bot.spawn import kill_agent, spawn_agent, get_tmux_output
from context.project_contexts import PROJECTS, list_projects
from registry.task_registry import get_task, list_tasks, update_task

# ── Auth ──────────────────────────────────────────────────────────────────────

ALLOWED_CHAT_IDS: set[int] = {
    int(x.strip())
    for x in os.environ.get("ALLOWED_CHAT_IDS", "").split(",")
    if x.strip().isdigit()
}


def _is_authorized(update: Update) -> bool:
    if not ALLOWED_CHAT_IDS:
        return True  # No restriction configured
    chat_id = update.effective_chat.id if update.effective_chat else None
    return chat_id in ALLOWED_CHAT_IDS


def _auth_required(func):
    """Decorator: reject unauthorized callers."""
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not _is_authorized(update):
            await update.message.reply_text("Unauthorized.")
            return
        return await func(update, context)
    wrapper.__name__ = func.__name__
    return wrapper


# ── /spawn ─────────────────────────────────────────────────────────────────────

@_auth_required
async def cmd_spawn(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Usage: /spawn {project} {task_type} | {description}
    Example: /spawn the-council ui | Add dark mode toggle to dashboard
    """
    text = " ".join(context.args or [])
    if "|" not in text:
        await update.message.reply_text(
            "Usage: /spawn {project} {task_type} | {description}\n"
            "Example: /spawn the-council ui | Fix the streaming bug"
        )
        return

    meta, description = text.split("|", 1)
    description = description.strip()
    parts = meta.strip().split()
    if len(parts) < 2:
        await update.message.reply_text("Provide both project and task_type before the |")
        return

    project = parts[0]
    task_type = parts[1]

    await update.message.reply_text(f"Spawning agent for *{project}* (`{task_type}`)...", parse_mode="Markdown")

    try:
        task = spawn_agent(
            task_description=description,
            project=project,
            task_type=task_type,
            telegram_chat_id=str(update.effective_chat.id),
        )
        reply = (
            f"Agent spawned\n"
            f"Task ID: `{task.id}`\n"
            f"Branch: `{task.branch}`\n"
            f"Project: {task.project}\n"
            f"Status: running\n\n"
            f"Monitoring every 10 minutes."
        )
        await update.message.reply_text(reply, parse_mode="Markdown")
    except RuntimeError as e:
        await update.message.reply_text(f"Failed to spawn: {e}")


# ── /tasks ─────────────────────────────────────────────────────────────────────

@_auth_required
async def cmd_tasks(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """List all tasks grouped by status."""
    all_tasks = list_tasks()
    if not all_tasks:
        await update.message.reply_text("No tasks in registry.")
        return

    groups: dict[str, list] = {"running": [], "blocked": [], "done": [], "killed": []}
    for t in all_tasks:
        groups.setdefault(t.status, []).append(t)

    lines = ["*Claw Tasks*\n"]

    if groups["running"]:
        lines.append("*Running:*")
        for t in groups["running"]:
            lines.append(f"  🔄 `{t.id}` — {t.description[:50]}")

    if groups["blocked"]:
        lines.append("\n*Blocked:*")
        for t in groups["blocked"]:
            lines.append(f"  ⚠️ `{t.id}` — {t.description[:50]}")

    done_recent = sorted(groups["done"], key=lambda t: t.completed_at or "", reverse=True)[:5]
    if done_recent:
        lines.append("\n*Recently Done:*")
        for t in done_recent:
            pr = f" · PR #{t.pr_number}" if t.pr_number else ""
            lines.append(f"  ✅ `{t.id}`{pr} — {t.description[:40]}")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")

    # Send inline keyboards for blocked tasks
    for t in groups["blocked"]:
        await update.message.reply_text(
            f"Blocked: `{t.id}`\n{t.failure_reason or 'No details'}",
            parse_mode="Markdown",
            reply_markup=build_task_keyboard(t.id),
        )


# ── /status ────────────────────────────────────────────────────────────────────

@_auth_required
async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Usage: /status {task_id}"""
    if not context.args:
        await update.message.reply_text("Usage: /status {task_id}")
        return

    task_id = context.args[0]
    task = get_task(task_id)
    if not task:
        await update.message.reply_text(f"Task not found: `{task_id}`", parse_mode="Markdown")
        return

    output = get_tmux_output(task_id, lines=3)
    last_output = "\n".join(output.splitlines()[-3:]) if output else "(no output)"

    lines = [
        f"*Task: `{task.id}`*",
        f"Status: {task.status}",
        f"Project: {task.project}",
        f"Type: {task.task_type}",
        f"Description: {task.description[:100]}",
        f"Branch: `{task.branch or 'none'}`",
        f"PR: #{task.pr_number}" if task.pr_number else "PR: none",
        f"Retries: {task.retry_count}",
        f"Started: {task.started_at[:19]}",
        "",
        "*Last tmux output:*",
        f"```\n{last_output[:300]}\n```",
    ]

    keyboard = build_task_keyboard(task_id) if task.status in ("running", "blocked") else None
    await update.message.reply_text(
        "\n".join(lines),
        parse_mode="Markdown",
        reply_markup=keyboard,
    )


# ── /projects ──────────────────────────────────────────────────────────────────

@_auth_required
async def cmd_projects(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """List known projects."""
    await update.message.reply_text(
        f"*Known Projects:*\n{list_projects()}",
        parse_mode="Markdown",
    )


# ── Callback queries ────────────────────────────────────────────────────────────

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()

    if not _is_authorized(update):
        await query.edit_message_text("Unauthorized.")
        return

    data = query.data or ""
    action, _, task_id = data.partition(":")

    if action == "kill":
        killed = kill_agent(task_id)
        update_task(task_id, status="killed", failure_reason="Killed via Telegram")
        msg = f"Session killed: `{task_id}`" if killed else f"Session not found: `{task_id}` (may have already ended)"
        await query.edit_message_text(msg, parse_mode="Markdown")

    elif action == "retry":
        task = get_task(task_id)
        if not task:
            await query.edit_message_text(f"Task not found: `{task_id}`", parse_mode="Markdown")
            return
        try:
            new_task = spawn_agent(
                task_description=task.description,
                project=task.project,
                task_type=task.task_type,
                telegram_chat_id=str(query.message.chat_id),
            )
            update_task(task_id, status="killed", failure_reason="Superseded by retry")
            await query.edit_message_text(
                f"Retried as `{new_task.id}`",
                parse_mode="Markdown",
            )
        except RuntimeError as e:
            await query.edit_message_text(f"Retry failed: {e}")

    elif action == "context":
        await query.edit_message_text(
            f"Reply to this message with additional context for task `{task_id}`.\n"
            f"(Context notes are not yet automatically injected — copy and re-spawn if needed.)",
            parse_mode="Markdown",
        )


# ── App factory ────────────────────────────────────────────────────────────────

def build_app(token: str) -> Application:
    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("spawn", cmd_spawn))
    app.add_handler(CommandHandler("tasks", cmd_tasks))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("projects", cmd_projects))
    app.add_handler(CallbackQueryHandler(handle_callback))
    return app


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)

    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("Error: TELEGRAM_BOT_TOKEN environment variable not set")
        sys.exit(1)

    print("[claw] Starting Telegram bot...")
    app = build_app(token)
    app.run_polling()
