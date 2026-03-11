# The Council — Project Context

## Stack
- **Frontend**: Next.js 14 App Router · TypeScript strict · Tailwind v3
- **Backend**: FastAPI · SQLAlchemy 2.0 async · PostgreSQL (Railway)
- **AI**: Anthropic SDK direct (no LangChain) · Haiku routing · Sonnet chat · Opus synthesis
- **Auth**: NextAuth v5 beta · bcryptjs · pg Pool for direct DB auth
- **Deployment**: Vercel (frontend) · Railway (backend + PostgreSQL)

## Key Files (10 most-modified)
1. `the-council/frontend/app/war-room/page.tsx` — War Room debate UI + SSE streaming
2. `the-council/frontend/app/private-desk/page.tsx` — 1-on-1 session UI
3. `the-council/backend/app/services/orchestrator.py` — War Room debate orchestration
4. `the-council/backend/app/services/private_desk_orchestrator.py` — Private Desk orchestration
5. `the-council/backend/app/agents/registry.py` — All 12 agent configs (single source of truth)
6. `the-council/frontend/app/globals.css` — Design tokens + utility classes + animations
7. `the-council/frontend/tailwind.config.ts` — Color tokens, font families, keyframes
8. `the-council/frontend/lib/design-system.ts` — AGENT_COLORS, AGENT_ROLES, helper functions
9. `the-council/backend/app/models.py` — SQLAlchemy ORM models (sessions, messages, insights, users)
10. `the-council/backend/app/services/insights.py` — Insight extraction + session analysis

## Architecture Notes
- SSE streaming: `debate_start → agent_start → agent_token × N → agent_end → synthesis → round_end`
- Token batching: `requestAnimationFrame` in War Room (60fps cap) prevents React re-render storm
- ConversationSidebar: uses `fixed md:relative` — participates in flex row on desktop, full-screen overlay on mobile
- AgentQuickLaunch: routes to `/war-room?agents=X,Y&prompt=Z` or `/private-desk?agents=X&prompt=Z`
- Utility pages (Academy/Workshop/Financial/Plans): localStorage-only, no backend calls

## Known Gotchas
- Edit tool requires reading the file first — always `Read` before `Edit`
- `Board(str, Enum)` in registry.py — use `.value` when assigning to string fields
- NextAuth v5 uses `auth.ts` at root, not `pages/api/auth/[...nextauth]`
- `BACKEND_URL` on Vercel MUST include `https://` — bare domain breaks Next.js rewrites
- framer-motion ease arrays must use `defaultEase` from `@/lib/animations` — inline `number[]` fails TypeScript

## What NOT to Touch
- `the-council/backend/app/agents/registry.py` `_register()` pattern — this is the agent config contract
- `the-council/backend/app/services/ai.py` tool execution — wrapped in `asyncio.wait_for(..., timeout=15.0)`
- `the-council/backend/app/database.py` `wait_for_db` — 10 retries, 0.5s delay for Railway cold-start

## URLs
- Production frontend: Vercel deployment
- Production backend: Railway deployment
- Railway dashboard: manage DATABASE_URL, ANTHROPIC_API_KEY
