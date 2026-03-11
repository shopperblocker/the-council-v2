#!/usr/bin/env bash
# ============================================================================
# Claw VPS Setup — Run on a fresh Ubuntu 22.04+ Hetzner VPS
#
# Usage:
#   1. Create Hetzner CX22 (2GB RAM, Ubuntu 22.04)
#   2. SSH in: ssh root@<your-ip>
#   3. Upload this script: scp vps-setup.sh root@<your-ip>:~/
#   4. Run: bash vps-setup.sh
#
# After setup, configure secrets:
#   nano /home/claw/.env
# Then start:
#   systemctl start claw-bot
# ============================================================================

set -euo pipefail

echo "========================================="
echo "  Claw VPS Setup"
echo "========================================="

# ── 1. System packages ─────────────────────────────────────────────────────

echo "[1/7] Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
  tmux \
  git \
  curl \
  python3 \
  python3-pip \
  python3-venv \
  gh \
  jq \
  > /dev/null

# ── 2. Create claw user ───────────────────────────────────────────────────

echo "[2/7] Creating claw user..."
if ! id -u claw &>/dev/null; then
  useradd -m -s /bin/bash claw
  echo "Created user: claw"
else
  echo "User claw already exists"
fi

# ── 3. Install Node.js (for Claude CLI) ───────────────────────────────────

echo "[3/7] Installing Node.js 20..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null
fi
echo "Node: $(node --version)"

# ── 4. Install Claude CLI ─────────────────────────────────────────────────

echo "[4/7] Installing Claude CLI..."
if ! command -v claude &>/dev/null; then
  npm install -g @anthropic-ai/claude-code > /dev/null 2>&1
fi
echo "Claude CLI: $(claude --version 2>/dev/null || echo 'installed')"

# ── 5. Clone repo & setup Python env ──────────────────────────────────────

echo "[5/7] Setting up Claw repository..."
CLAW_HOME="/home/claw"
REPO_DIR="$CLAW_HOME/the-council-v2"

if [ ! -d "$REPO_DIR" ]; then
  sudo -u claw git clone https://github.com/shopperblocker/the-council-v2.git "$REPO_DIR"
else
  sudo -u claw git -C "$REPO_DIR" pull --ff-only || true
fi

CLAW_DIR="$REPO_DIR/claw"

# Python venv
if [ ! -d "$CLAW_DIR/.venv" ]; then
  sudo -u claw python3 -m venv "$CLAW_DIR/.venv"
fi
sudo -u claw "$CLAW_DIR/.venv/bin/pip" install -q -r "$CLAW_DIR/requirements.txt"

# Create task store directory
sudo -u claw mkdir -p "$CLAW_HOME/.claw"

# ── 6. Create .env template ───────────────────────────────────────────────

echo "[6/7] Setting up environment..."
ENV_FILE="$CLAW_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" << 'ENVEOF'
# Claw Bot Configuration
# Fill these in, then run: systemctl start claw-bot

TELEGRAM_BOT_TOKEN=YOUR_TOKEN_HERE
ANTHROPIC_API_KEY=YOUR_KEY_HERE

# Your Telegram chat ID (send /start to @userinfobot to find it)
# Comma-separated for multiple IDs
ALLOWED_CHAT_IDS=

# Optional: Council API URL for task sync
# COUNCIL_API_URL=https://your-council-backend.railway.app
# DATABASE_URL=postgresql://...
ENVEOF
  chown claw:claw "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Created $ENV_FILE — edit with your secrets!"
else
  echo ".env already exists, skipping"
fi

# ── 7. Systemd service + cron ─────────────────────────────────────────────

echo "[7/7] Setting up systemd service and cron..."

# Systemd service for the Telegram bot
cat > /etc/systemd/system/claw-bot.service << EOF
[Unit]
Description=Claw Telegram Bot
After=network.target

[Service]
Type=simple
User=claw
WorkingDirectory=$CLAW_DIR
EnvironmentFile=$CLAW_DIR/.env
ExecStart=$CLAW_DIR/.venv/bin/python bot/handlers.py
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable claw-bot

# Cron: check agents every 10 minutes + morning brief at 7am
CRON_LINE="*/10 * * * * . $CLAW_DIR/.env && $CLAW_DIR/scripts/check_agents.sh >> /home/claw/.claw/monitor.log 2>&1"
BRIEF_LINE="0 7 * * * . $CLAW_DIR/.env && $CLAW_DIR/scripts/check_agents.sh --morning-brief >> /home/claw/.claw/monitor.log 2>&1"

(sudo -u claw crontab -l 2>/dev/null | grep -v "check_agents" || true; echo "$CRON_LINE"; echo "$BRIEF_LINE") | sudo -u claw crontab -

# ── Done ───────────────────────────────────────────────────────────────────

echo ""
echo "========================================="
echo "  Setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "  1. Edit secrets:"
echo "     nano $CLAW_DIR/.env"
echo ""
echo "  2. Add your Telegram bot token and Anthropic API key"
echo ""
echo "  3. Authenticate GitHub CLI (for PR checks):"
echo "     sudo -u claw gh auth login"
echo ""
echo "  4. Authenticate Claude CLI:"
echo "     sudo -u claw claude auth login"
echo ""
echo "  5. Start the bot:"
echo "     systemctl start claw-bot"
echo ""
echo "  6. Check status:"
echo "     systemctl status claw-bot"
echo "     journalctl -u claw-bot -f"
echo ""
echo "  7. Test from Telegram:"
echo "     /projects"
echo "     /spawn the-council ui | Test task"
echo ""
