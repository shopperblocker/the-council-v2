#!/usr/bin/env bash
# Claw Agent Monitor — checks running tasks and notifies via Telegram.
# Cron: */10 * * * * /path/to/claw/scripts/check_agents.sh
#       0 7 * * *   /path/to/claw/scripts/check_agents.sh --morning-brief

set -euo pipefail

CLAW_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STORE="$HOME/.claw/active-tasks.json"
MAX_RETRIES=3

# ── Telegram notify helper ──────────────────────────────────────────────────
notify() {
  local chat_id="$1"
  local message="$2"
  if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "$chat_id" ]]; then
    echo "[claw] WARN: Telegram not configured, skipping notify"
    return 0
  fi
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=$chat_id" \
    --data-urlencode "text=$message" \
    --data-urlencode "parse_mode=Markdown" \
    > /dev/null
}

# ── Morning brief ───────────────────────────────────────────────────────────
if [[ "${1:-}" == "--morning-brief" ]]; then
  if [[ ! -f "$STORE" ]]; then
    echo "[claw] No tasks file found."
    exit 0
  fi

  BRIEF=$(python3 -c "
import json, sys
with open('$STORE') as f:
    tasks = json.load(f)
running = [t for t in tasks if t['status'] == 'running']
blocked = [t for t in tasks if t['status'] == 'blocked']
done_today = [t for t in tasks if t['status'] == 'done']

lines = ['*Claw Morning Brief*']
lines.append(f'Running: {len(running)}  |  Blocked: {len(blocked)}  |  Done (total): {len(done_today)}')
if blocked:
    lines.append('')
    lines.append('*Blocked:*')
    for t in blocked[:3]:
        lines.append(f'  ⚠️ [{t[\"id\"]}] {t[\"description\"][:60]}')
if running:
    lines.append('')
    lines.append('*Running:*')
    for t in running[:5]:
        lines.append(f'  🔄 [{t[\"id\"]}] {t[\"description\"][:60]}')
print('\n'.join(lines))
")

  CHAT_ID="${ALLOWED_CHAT_IDS:-}"
  CHAT_ID="${CHAT_ID%%,*}"  # Take first ID
  notify "$CHAT_ID" "$BRIEF"
  exit 0
fi

# ── Per-task check loop ─────────────────────────────────────────────────────
if [[ ! -f "$STORE" ]]; then
  echo "[claw] No tasks file, nothing to check."
  exit 0
fi

python3 - <<'PYEOF'
import json
import os
import subprocess
import sys
from pathlib import Path

STORE = Path.home() / ".claw" / "active-tasks.json"
MAX_RETRIES = int(os.environ.get("CLAW_MAX_RETRIES", "3"))
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ALLOWED_IDS = os.environ.get("ALLOWED_CHAT_IDS", "").split(",")
DEFAULT_CHAT = ALLOWED_IDS[0].strip() if ALLOWED_IDS else ""


def notify(chat_id: str, msg: str):
    if not BOT_TOKEN or not chat_id:
        return
    subprocess.run(
        ["curl", "-s", "-X", "POST",
         f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
         "--data-urlencode", f"chat_id={chat_id}",
         "--data-urlencode", f"text={msg}",
         "--data-urlencode", "parse_mode=Markdown"],
        capture_output=True,
    )


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, **kwargs)


def check_tmux(task_id: str) -> bool:
    result = run(["tmux", "has-session", "-t", f"claw-{task_id}"])
    return result.returncode == 0


def check_ci_passed(branch: str) -> bool | None:
    if not branch:
        return None
    result = run(["gh", "run", "list", "--branch", branch, "--limit", "1", "--json", "conclusion"])
    if result.returncode != 0:
        return None
    try:
        data = json.loads(result.stdout)
        if data and data[0]["conclusion"] == "success":
            return True
        elif data and data[0]["conclusion"] in ("failure", "cancelled"):
            return False
    except (json.JSONDecodeError, KeyError, IndexError):
        pass
    return None


def check_pr_exists(branch: str) -> int | None:
    if not branch:
        return None
    result = run(["gh", "pr", "list", "--head", branch, "--json", "number", "--limit", "1"])
    if result.returncode != 0:
        return None
    try:
        data = json.loads(result.stdout)
        return data[0]["number"] if data else None
    except (json.JSONDecodeError, IndexError):
        return None


with open(STORE) as f:
    tasks = json.load(f)

changed = False
for task in tasks:
    if task["status"] != "running":
        continue

    task_id = task["id"]
    chat_id = task.get("telegram_chat_id") or DEFAULT_CHAT
    branch = task.get("branch", "")

    # Check if tmux session still running
    if not check_tmux(task_id):
        # Session gone — check CI
        ci = check_ci_passed(branch) if branch else None
        pr_num = check_pr_exists(branch) if branch else None

        if ci is True:
            task["status"] = "done"
            task["pr_number"] = pr_num
            from datetime import datetime, timezone
            task["completed_at"] = datetime.now(timezone.utc).isoformat()
            changed = True
            pr_link = f" · PR #{pr_num}" if pr_num else ""
            notify(chat_id, f"✅ *Done* [{task_id}]\n{task['description'][:80]}{pr_link}")

        elif ci is False:
            retries = task.get("retry_count", 0)
            if retries < MAX_RETRIES:
                task["retry_count"] = retries + 1
                task["status"] = "running"
                changed = True
                notify(chat_id, f"🔄 *Retrying* [{task_id}] (attempt {retries + 2})\n{task['description'][:60]}")
                # Would respawn here — left for bot/spawn.py
            else:
                task["status"] = "blocked"
                changed = True
                notify(chat_id, f"⚠️ *Blocked* [{task_id}] — CI failed {MAX_RETRIES}x\n{task['description'][:60]}")
        else:
            # No branch/CI to check — just mark as needs review
            task["status"] = "blocked"
            task["failure_reason"] = "tmux session ended without CI confirmation"
            changed = True
            notify(chat_id, f"⚠️ *Check needed* [{task_id}] — session ended\n{task['description'][:60]}")

if changed:
    with open(STORE, "w") as f:
        json.dump(tasks, f, indent=2)
    print(f"[claw] Updated task registry.")
else:
    print(f"[claw] All {len([t for t in tasks if t['status'] == 'running'])} running tasks still active.")
PYEOF
