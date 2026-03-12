#!/usr/bin/env bash
# Start the Claw Webhook Server.
# Loads .env from this directory, then runs the FastAPI server.

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Error: No .env file found in claw/"
  echo "Create one with your secrets (see .env.example)"
  exit 1
fi

set -a
source .env
set +a

PORT="${WEBHOOK_PORT:-8080}"

echo "Starting Claw webhook server on port ${PORT}..."
exec python -m uvicorn webhooks.server:app --host 0.0.0.0 --port "${PORT}"
