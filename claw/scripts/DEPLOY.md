# Deploy Claw to DigitalOcean — 5 Minute Guide

## 1. Create Account (free $200 credit)

1. Go to **digitalocean.com** → Sign up
2. New accounts get **$200 free credit for 60 days**
3. Add a payment method (won't charge until credits run out)

## 2. Create Droplet

1. Click **Create → Droplets**
2. Settings:
   - **Region**: New York (NYC1) or closest to you
   - **Image**: Ubuntu 24.04 LTS
   - **Size**: Basic → Regular → **$6/mo** (1 GB / 1 CPU / 25 GB SSD)
   - **Authentication**: Click **SSH Key** → **New SSH Key**

### Generate SSH Key (if you don't have one)

Open your local terminal (PowerShell or Git Bash):
```bash
ssh-keygen -t ed25519 -C "kyle-claw"
```
Press Enter for all prompts. Then copy the public key:
```bash
cat ~/.ssh/id_ed25519.pub
```
Paste that into the DigitalOcean "New SSH Key" field.

3. **Hostname**: `claw`
4. Click **Create Droplet**
5. Copy the **IP address** shown (e.g. `164.90.xxx.xxx`)

## 3. Connect & Run Setup

From Git Bash or PowerShell on your laptop:

```bash
# Upload the setup script
scp claw/scripts/vps-setup.sh root@YOUR_IP:~/

# Connect
ssh root@YOUR_IP

# Run setup (takes ~2 minutes)
bash vps-setup.sh
```

## 4. Add Your Secrets

Still on the VPS:

```bash
nano /home/claw/the-council-v2/claw/.env
```

Fill in:
```
TELEGRAM_BOT_TOKEN=8639724434:AAG_kY0uR6Y4MeUHmHyNDQAeQ_rsVAU_r_0
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
ALLOWED_CHAT_IDS=YOUR_TELEGRAM_CHAT_ID
```

> **Find your Telegram chat ID**: Message @userinfobot on Telegram, it replies with your ID.

Save: `Ctrl+O` → Enter → `Ctrl+X`

## 5. Authenticate CLIs

```bash
# GitHub CLI (for PR checks)
sudo -u claw gh auth login
# → Choose: GitHub.com → HTTPS → Paste a token
# → Get token at: github.com/settings/tokens (scopes: repo, read:org)

# Claude CLI
sudo -u claw claude auth login
# → Follow the browser link / paste the code
```

## 6. Start Claw

```bash
# Start the bot
systemctl start claw-bot

# Verify it's running
systemctl status claw-bot
```

You should see `Active: active (running)`. Now go to Telegram and send `/projects` to your bot.

## 7. Test It

In Telegram:
```
/projects          — see known projects
/tasks             — see task list (empty at first)
/spawn the-council ui | Test task from Telegram
/status <task-id>  — check on a running agent
```

## Day-to-Day Commands

```bash
# SSH in
ssh root@YOUR_IP

# View bot logs (live)
journalctl -u claw-bot -f

# Restart bot
systemctl restart claw-bot

# View monitor logs
cat /home/claw/.claw/monitor.log

# List running tmux sessions (agent work)
sudo -u claw tmux ls

# Attach to an agent session (watch it work)
sudo -u claw tmux attach -t claw-<task-id>
# Detach: Ctrl+B then D

# Pull latest code
cd /home/claw/the-council-v2 && sudo -u claw git pull
systemctl restart claw-bot
```

## Scaling Up Later

DigitalOcean makes this trivial:

1. **More RAM/CPU**: Droplet → Resize → pick a bigger plan (no data loss)
2. **Multiple agents**: The $6 plan handles 2-3 concurrent agents fine. Resize to $12 (2GB) for 5+.
3. **Move Council backend here**: Install Docker, run the FastAPI backend alongside Claw
4. **Add monitoring**: DigitalOcean has built-in graphs (CPU, RAM, disk) in the dashboard

## Costs

| Usage | Plan | Cost |
|-------|------|------|
| Claw only (1-3 agents) | Basic $6/mo | **$6/mo** |
| Claw + Council backend | Basic $12/mo | **$12/mo** |
| Heavy agent usage (5+) | Basic $24/mo | **$24/mo** |

First 60 days free with $200 credit.

## Troubleshooting

**Bot won't start?**
```bash
journalctl -u claw-bot --no-pager -n 50
```

**Agent spawn fails?**
- Check tmux is installed: `which tmux`
- Check claude CLI: `sudo -u claw claude --version`
- Check the .env has ANTHROPIC_API_KEY

**Can't SSH in?**
- Check IP is correct in DigitalOcean dashboard
- Try: `ssh -v root@YOUR_IP` for verbose output

**Stop the bot (before using locally again):**
```bash
systemctl stop claw-bot
```
Only one instance of the bot can poll Telegram at a time.
