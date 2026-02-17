---
name: deploy
description: Deploy The Council v2 to production (Railway backend + Vercel frontend). Use when the user wants to ship changes, merge a PR, or asks how to deploy.
disable-model-invocation: true
allowed-tools: Bash(git *)
---

# Deploying The Council v2

## Architecture
- **Backend**: Railway (FastAPI) — auto-deploys when `main` branch is updated
- **Frontend**: Vercel (Next.js 14) — auto-deploys when `main` branch is updated
- **Dev branch**: `claude/ai-council-updates-wN6WK`

## Critical Constraints

**You can NEVER push directly to `main`.** The remote returns HTTP 403.
Only branches starting with `claude/` can be pushed to.

The deploy flow is always:
1. Commit changes to `claude/ai-council-updates-wN6WK`
2. Push to `origin claude/ai-council-updates-wN6WK`
3. User opens PR on GitHub: `claude/ai-council-updates-wN6WK` → `main`
4. User merges PR → Railway and Vercel auto-redeploy (~2-3 min)

## Step-by-Step

### 1. Commit your changes
```bash
git add <specific files>  # Never use git add -A — could include .env
git commit -m "Your message

https://claude.ai/code/session_013HPXWGya1GxXx8ucFQPLKs"
```

### 2. Push to feature branch
```bash
git push -u origin claude/ai-council-updates-wN6WK
```

### 3. Handle merge conflicts (if PR shows conflicts)
The feature branch and `main` may diverge. Fix with rebase:
```bash
git fetch origin
git rebase origin/main
# Resolve any conflicts — always keep the feature branch version for:
#   - api.ts (env var URL, not hardcoded Railway URL)
#   - tools.py (yfinance implementation, not mock)
#   - config.py (model_config dict, not class Config)
git add <resolved files>
git rebase --continue
git push -u origin claude/ai-council-updates-wN6WK --force
```

### 4. Tell user to merge the PR
The PR URL is shown after push. User merges on GitHub.

## Post-Deploy Checks

After Railway redeploys, verify:
- Backend health: `GET /health` returns 200
- Private Desk agents load: `GET /api/private-desk/agents`

## Vercel Environment Variable (one-time setup)
If the frontend can't reach the backend, the user needs to set this in Vercel dashboard:
```
NEXT_PUBLIC_API_URL = https://the-council-backend-production-e480.up.railway.app/api
```
Settings → Environment Variables → Add → Redeploy

## Common Mistakes
- ❌ `git push origin main` → 403, don't retry
- ❌ Hardcoding the Railway URL in `api.ts` → use `process.env.NEXT_PUBLIC_API_URL`
- ❌ `git add .` → could accidentally stage `.env`
