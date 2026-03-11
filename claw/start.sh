#!/usr/bin/env bash
# Start the Claw Telegram bot.
# Loads .env from this directory, then runs the bot.

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Error: No .env file found in claw/"
  echo "Create one with: echo 'TELEGRAM_BOT_TOKEN=your-token-here' > .env"
  exit 1
fi

set -a
source .env
set +a

echo "Starting Claw bot..."
python bot/handlers.py
