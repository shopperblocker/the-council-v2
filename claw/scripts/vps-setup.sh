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

echo "[1/10] Installing system packages..."
apt-get update -qq

# Install base packages (gh is handled separately in step 2)
apt-get install -y -qq \
  tmux \
  git \
  curl \
  python3 \
  python3-pip \
  python3-venv \
  jq \
  > /dev/null

# ── 2. Install GitHub CLI via official repository ──────────────────────────

echo "[2/10] Installing GitHub CLI..."
if ! command -v gh &>/dev/null; then
  # Official GitHub CLI installation method for Debian/Ubuntu
  (type -p wget >/dev/null || (apt-get update -qq && apt-get install -y -qq wget > /dev/null))
  mkdir -p -m 755 /etc/apt/keyrings
  out=$(wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg) \
    && echo "$out" | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
  chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    | tee /etc/apt/sources.list.d/github-cli-stable.list > /dev/null
  apt-get update -qq
  apt-get install -y -qq gh > /dev/null
fi
echo "GitHub CLI: $(gh --version 2>/dev/null | head -1 || echo 'installed')"

# ── 3. Create claw user ───────────────────────────────────────────────────

echo "[3/10] Creating claw user..."
if ! id -u claw &>/dev/null; then
  useradd -m -s /bin/bash claw
  echo "Created user: claw"
else
  echo "User claw already exists"
fi

# ── 4. Install Node.js (for Claude CLI) ───────────────────────────────────

echo "[4/10] Installing Node.js 20..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null
fi
echo "Node: $(node --version)"

# ── 5. Install Claude CLI ─────────────────────────────────────────────────

echo "[5/10] Installing Claude CLI..."
if ! command -v claude &>/dev/null; then
  npm install -g @anthropic-ai/claude-code > /dev/null 2>&1
fi
echo "Claude CLI: $(claude --version 2>/dev/null || echo 'installed')"

# ── 6. Clone repo & setup Python env ──────────────────────────────────────

echo "[6/10] Setting up Claw repository..."
CLAW_HOME="/home/claw"
REPO_DIR="$CLAW_HOME/the-council-v2"

# Resilience: if the directory exists but is empty or broken (failed clone),
# remove it so the clone can succeed on retry.
if [ -d "$REPO_DIR" ]; then
  if [ ! -d "$REPO_DIR/.git" ]; then
    echo "  Found broken/empty repo directory — cleaning up for retry..."
    rm -rf "$REPO_DIR"
  fi
fi

if [ ! -d "$REPO_DIR" ]; then
  sudo -u claw git clone https://github.com/shopperblocker/the-council-v2.git "$REPO_DIR"
else
  sudo -u claw git -C "$REPO_DIR" pull --ff-only || true
fi

CLAW_DIR="$REPO_DIR/claw"

# Python venv — clean up broken venvs (missing pyvenv.cfg means unusable)
if [ -d "$CLAW_DIR/.venv" ] && [ ! -f "$CLAW_DIR/.venv/pyvenv.cfg" ]; then
  echo "  Found broken Python venv — recreating..."
  rm -rf "$CLAW_DIR/.venv"
fi

if [ ! -d "$CLAW_DIR/.venv" ]; then
  sudo -u claw python3 -m venv "$CLAW_DIR/.venv"
fi
sudo -u claw "$CLAW_DIR/.venv/bin/pip" install -q -r "$CLAW_DIR/requirements.txt"

# Create task store directory
sudo -u claw mkdir -p "$CLAW_HOME/.claw"

# ── 7. Create .env template ───────────────────────────────────────────────

echo "[7/10] Setting up environment..."
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

# Verify .env has correct ownership and permissions regardless
chown claw:claw "$ENV_FILE"
chmod 600 "$ENV_FILE"

# ── 8. Generate SSH key for claw user ─────────────────────────────────────

echo "[8/10] Setting up SSH key for claw user..."
CLAW_SSH_DIR="$CLAW_HOME/.ssh"
CLAW_SSH_KEY="$CLAW_SSH_DIR/id_ed25519"

sudo -u claw mkdir -p "$CLAW_SSH_DIR"
chmod 700 "$CLAW_SSH_DIR"

if [ ! -f "$CLAW_SSH_KEY" ]; then
  sudo -u claw ssh-keygen -t ed25519 -C "claw@$(hostname)" -f "$CLAW_SSH_KEY" -N ""
  echo "Generated new SSH key for claw user"
else
  echo "SSH key already exists for claw user"
fi

echo ""
echo "  Claw public key (add to GitHub deploy keys or authorized_keys):"
echo "  ────────────────────────────────────────────────────────────────"
cat "$CLAW_SSH_KEY.pub"
echo "  ────────────────────────────────────────────────────────────────"
echo ""

# ── 9. Systemd service + cron ─────────────────────────────────────────────

echo "[9/10] Setting up systemd service and cron..."

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

# ── 10. Set up SSH key auth for root ──────────────────────────────────────

echo "[10/10] Setting up SSH key authentication for root..."
ROOT_SSH_DIR="/root/.ssh"
AUTH_KEYS="$ROOT_SSH_DIR/authorized_keys"

mkdir -p "$ROOT_SSH_DIR"
chmod 700 "$ROOT_SSH_DIR"
touch "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"

echo ""
echo "  To enable password-less SSH into this VPS, paste your laptop's"
echo "  public key below (usually from ~/.ssh/id_ed25519.pub or ~/.ssh/id_rsa.pub)."
echo ""
echo "  Paste the key and press Enter (or press Enter with no input to skip):"
echo ""
read -r USER_PUBKEY

if [ -n "$USER_PUBKEY" ]; then
  # Avoid adding duplicates
  if grep -qF "$USER_PUBKEY" "$AUTH_KEYS" 2>/dev/null; then
    echo "  Key already present in authorized_keys, skipping"
  else
    echo "$USER_PUBKEY" >> "$AUTH_KEYS"
    echo "  Key added to $AUTH_KEYS"
  fi

  # Ensure PubkeyAuthentication is enabled in sshd_config
  if grep -q "^#\?PubkeyAuthentication" /etc/ssh/sshd_config; then
    sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
  else
    echo "PubkeyAuthentication yes" >> /etc/ssh/sshd_config
  fi
  systemctl reload sshd 2>/dev/null || systemctl reload ssh 2>/dev/null || true
  echo "  SSH key auth enabled — test with: ssh root@$(hostname -I | awk '{print $1}')"
else
  echo "  Skipped — you can add keys later to $AUTH_KEYS"
fi

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
echo "  5. Add claw's SSH key to GitHub (for git operations):"
echo "     cat $CLAW_SSH_KEY.pub"
echo "     # Then add at: https://github.com/settings/keys"
echo ""
echo "  6. Start the bot:"
echo "     systemctl start claw-bot"
echo ""
echo "  7. Check status:"
echo "     systemctl status claw-bot"
echo "     journalctl -u claw-bot -f"
echo ""
echo "  8. Test from Telegram:"
echo "     /projects"
echo "     /spawn the-council ui | Test task"
echo ""
