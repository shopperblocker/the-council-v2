# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**The Council v2** is a multi-agent AI advisory platform where 12 historical figures (agents) provide advice across 4 specialized "boards" (War Room, Clinic, Academy, Engine Room). Built with FastAPI backend + Next.js frontend + PostgreSQL, using Anthropic SDK directly (no LangChain).

**Core Feature**: Multi-agent debates where agents respond sequentially with full context of prior responses, streamed in real-time via Server-Sent Events.

## Development Commands

### Initial Setup
```bash
# Start PostgreSQL
docker compose up -d

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env to add ANTHROPIC_API_KEY

# Frontend setup
cd ../frontend
npm install
```

### Running the Application
```bash
# Terminal 1: Backend (from backend/)
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend (from frontend/)
npm run dev

# Access at http://localhost:3000
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build
npm start

# Backend runs with: uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Architecture

### AI Model Strategy (Tiered by Purpose)
- **Haiku 4.5** (`claude-haiku-4-5-20251001`): Query routing, fast classification (~1s, low cost)
- **Sonnet 4.5** (`claude-sonnet-4-5-20250929`): Agent chat responses (quality + speed balance)
- **Opus 4.6** (`claude-opus-4-6`): Debate synthesis, deep analysis (maximum intelligence)

Models configured in `backend/app/config.py` via `model_router`, `model_chat`, `model_deep`.

### Backend Structure (`backend/app/`)

**Core Entry**: `main.py` - FastAPI app with CORS, lifespan events (DB init/cleanup)

**Configuration**: `config.py` - Pydantic settings from `.env` (API keys, database URL, model choices). Auto-fixes `postgres://` → `postgresql+asyncpg://` for Railway compatibility.

**Middleware** (`middleware/`):
- `auth.py` - `ApiKeyMiddleware`: Bearer token auth (skips `/api/health`). Enabled when `API_KEY` is set in `.env`.

**Database Layer**:
- `database.py` - Async SQLAlchemy engine with `asyncpg`, session management
- `models.py` - ORM models (see Database Schema below)
- Database auto-creates tables on startup via `init_db()` in lifespan

**Agent System** (`agents/`):
- `registry.py` - **Single source of truth** for all 12 agents. Each `AgentConfig` defines: name, role, emoji, color, voice, core_belief, instruction, specializations, temperature. `Board` is a `str, Enum` — use `.value` when assigning to string fields.
- `prompts.py` - Constitution (behavioral laws all agents follow), User Dossier (context about Kyle), system prompt builders

**4 Boards**:
1. **War Room**: Rockefeller (CFO), Napoleon (Emperor), Bismarck (Chancellor), Madam Walker (Hustler)
2. **Clinic**: Marcus Aurelius (Stoic), Frankl (Meaning-Maker), Wim Hof (Iceman)
3. **Academy**: Feynman (Explainer), Da Vinci (Polymath), Socrates (Gadfly)
4. **Engine Room**: Ben Franklin (Pragmatist), Steve Jobs (Perfectionist)

**Services** (`services/`):
- `ai.py` - Direct Anthropic SDK wrapper. Methods:
  - `generate()` - Non-streaming responses (routing, classification)
  - `stream()` - Async token streaming for agent responses (tool execution wrapped in `asyncio.wait_for(..., timeout=15.0)`)
  - `stream_with_tools()` - Streaming with Anthropic tool_use support (Private Desk)
  - `route_query()` - Uses Haiku to select 2-4 relevant agents for a question
  - `synthesize_debate()` - Uses Opus to summarize consensus/tensions/actions
- `orchestrator.py` - **War Room brain**:
  - `start_debate()` - Routes → creates session → streams agents sequentially → extract memories → generate insights → synthesize with Opus
  - `follow_up()` - Follow-up with conversation history, @mention support, same post-processing
  - SSE events: `debate_start`, `agent_start`, `agent_token`, `agent_end`, `synthesis`, `round_end`
- `private_desk_orchestrator.py` - **Private Desk brain**: 1-on-1 sessions with full tool use + dossier + memory + insights
- `memory.py` - `MemoryService`:
  - `extract_and_store()` - Uses Haiku post-turn to extract facts + commitments → stores in `shared_memory` table
  - `recall_for_prompt()` - Formats recent memories for injection into system prompts
  - `get_accountability_context()` - Returns recent `commitment` category memories → injected so agents follow up on what Kyle said he'd do
- `insights.py` - `InsightService`:
  - `generate_insight()` - Uses Haiku post-turn to extract high-value insights → stores in `insights` table
  - `list_unviewed()` / `mark_viewed()` / `mark_acted_on()` - Lifecycle management
- `profile.py` - `ProfileService`:
  - `get_or_create()` - Returns or seeds the single `UserProfile` row
  - `to_dossier_string()` - Formats DB profile into the agent prompt DOSSIER section (replaces hardcoded `USER_DOSSIER`)
- `tools.py` - Agent-callable tools: `web_search` (Tavily live, falls back to curated), `get_stock_price` (yfinance + HTTP fallback), `calculator` (safe AST eval)

**API Routes** (`routes/`):
- `war_room.py`:
  - `POST /api/war-room/debate` - Start new debate (SSE stream)
  - `POST /api/war-room/session/{session_id}/message` - Follow-up in existing session (SSE stream)
  - `GET /api/war-room/session/{session_id}` - Retrieve session with full message history
  - `GET /api/war-room/sessions` - List recent War Room sessions (`limit`: 1–100)
  - `GET /api/war-room/agents` - List all available agents
  - `GET /api/war-room/agents/board/{board}` - List agents on a specific board
- `private_desk.py`:
  - `POST /api/private-desk/conversation` - Start a new 1-on-1 session (SSE stream)
  - `POST /api/private-desk/session/{session_id}/message` - Continue an existing session (SSE stream)
  - `GET /api/private-desk/session/{session_id}` - Retrieve session with full message history
  - `GET /api/private-desk/sessions` - List recent Private Desk sessions (`limit`: 1–100)
  - `GET /api/private-desk/agents` - List all agents available for Private Desk
- `financial.py` - `/api/financial/*`: accounts, transactions, portfolio positions, dashboard summary
- `plans.py` - `/api/plans/*`: plans CRUD, milestones
- `academy.py` - `/api/academy/*`: study paths, topics, Feynman explanations
- `business.py` - `/api/business/*`: products, orders (reselling/arbitrage tracking)
- `profile.py` - `/api/profile/*`: user profile CRUD (replaces hardcoded USER_DOSSIER)
- `insights.py` - `/api/insights/*`: agent-generated insights (404 raises `HTTPException`)
- `content.py` - `/api/content/*`: content planning
- `workshop.py` - `/api/workshop/*`: collaborative tools

### Frontend Structure (`frontend/`)

**Next.js App Router** (`app/`):
- `layout.tsx` - Root layout
- `page.tsx` - Cinematic landing page (10 sections, dark theme, framer-motion)
- `globals.css` - Glassmorphism styling + animations
- `dashboard/page.tsx` - Dashboard hub linking all feature pages
- `war-room/page.tsx` - War Room multi-agent debate with SSE streaming
- `private-desk/page.tsx` - 1-on-1 Private Desk sessions
- `financial/page.tsx` - Financial HQ (accounts, transactions, portfolio)
- `plans/page.tsx` - Plans Hub (goals + milestones)
- `academy/page.tsx` - Academy (study paths, Feynman learning)
- `business/page.tsx` - Business Engine (product/order tracker)
- `content/page.tsx` - Content planning
- `profile/page.tsx` - User profile editor
- `workshop/page.tsx` - Workshop (collaborative tools)

**Components** (`components/`):
- `GlassPanel.tsx` - Reusable glass container
- `ChatMessage.tsx` - Message bubbles with agent-specific colors (`React.memo` + `useMemo` for markdown)
- `AgentCard.tsx` - Agent info cards
- `SessionHistory.tsx` - Session list with `AbortController` for stale-fetch cancellation
- `ErrorBanner.tsx` - Reusable error display component
- `MobileDrawer.tsx` - Mobile navigation drawer
- `landing/` - 10 landing page section components: `Navbar`, `Hero`, `Marquee`, `AdvisorShowcase`, `AdvisorCard`, `HowItWorks`, `StepCard`, `WarRoomPreview`, `FinalCTA`, `Footer`

**Client Library** (`lib/`):
- `api.ts` - API client with SSE streaming support; `isTokenEvent()` type guard
- `types.ts` - TypeScript interfaces
- `advisors.ts` - 5 advisor data objects for the landing page
- `animations.ts` - Shared framer-motion variants; `defaultEase` typed as `[number, number, number, number]`

## Key Implementation Patterns

### Adding a New Agent
1. Add `AgentConfig` to `backend/app/agents/registry.py` using `_register()`
2. Specify: name, display_name, board, role, emoji, color, voice, core_belief, instruction, specializations
3. Agent automatically available in routing and debates

### Agent Response Flow
1. User asks question → `POST /api/war-room/debate`
2. `orchestrator.start_debate()` calls `ai.route_query()` (Haiku selects agents)
3. For each selected agent:
   - Build system prompt via `build_debate_prompt()` with CONSTITUTION + USER_DOSSIER + agent identity + prior agent responses
   - Stream response via `ai.stream()` (Sonnet)
   - Save to database as `Message`
   - Include in `prior_messages` for next agent's context
4. Frontend receives SSE events and displays tokens in real-time

### Prompt Architecture
Every agent receives:
- **CONSTITUTION**: 4 laws (Junto Protocol/humility, High Agency/actionable advice, Role Fidelity/stay in character, Conciseness)
- **USER_DOSSIER**: Kyle's context (19yo, Howard freshman, business goals, psychological framework, constraints)
- **Agent Identity**: display_name, role, voice, core_belief, mandate (instruction)
- **Debate Context**: Topic + prior agent responses (so agents can respond to each other)

This is built in `prompts.py` via `build_system_prompt()` → `build_debate_prompt()`.

### Database Sessions
- Each debate creates a `Session` (UUID, mode, topic, agent list)
- All messages linked to session via `session_id`
- Follow-ups load full conversation history to maintain context
- Use `async_session` from `database.py`, wrapped in FastAPI dependency `get_db()`

### SSE Streaming Protocol
Events emitted by War Room orchestrator:
- `debate_start` - Session ID, agent list, topic
- `agent_start` - Agent metadata (name, display_name, emoji, color)
- `agent_token` - Individual token from agent response
- `agent_end` - Agent finished
- `synthesis` - Opus synthesis of the full debate (consensus, tensions, action)
- `round_end` - All agents finished (`has_synthesis: bool`)
- `error` - Error message

Private Desk additionally emits: `conversation_start`, `tool_call`, `conversation_end`.

Format: `event: {event_name}\ndata: {json_data}\n\n`

### Frontend Streaming
- War Room buffers tokens with `requestAnimationFrame` (60fps max)
- All animated components import `defaultEase` from `@/lib/animations` — inline `number[]` arrays fail TypeScript
- `useReducedMotion()` checked in every animated component

## Environment Configuration

**Backend `.env`** (required):
```bash
ANTHROPIC_API_KEY=sk-ant-xxxxx  # Required
DATABASE_URL=postgresql+asyncpg://council:council@localhost:5432/council
CORS_ORIGINS=http://localhost:3000
API_KEY=                         # Optional: enables Bearer token auth middleware
TAVILY_API_KEY=                  # Optional: enables live web search (tavily.com, free tier 1000/mo)
```

**Frontend**: No environment variables required for local dev (API proxied via Next.js rewrites to localhost:8000)

## Database Schema

**sessions**: `id` (UUID), `mode` (war_room/private_desk/junto), `topic`, `user_context` (JSON), `agents` (JSON), `created_at`

**messages**: `id`, `session_id` (FK), `sender`, `sender_type` (user/agent), `content`, `created_at`

**shared_memory**: Cross-session persistent facts (`category`, `key`, `value`, `source_agent`, `confidence`, `session_id`)

**insights**: Agent-generated autonomous insights (`agent_name`, `insight_type`, `title`, `content`, `priority`, `viewed`, `acted_on`)

**user_profiles**: Editable user profile replacing hardcoded USER_DOSSIER

**financial_accounts**: `name`, `account_type`, `balance`, `target`, `target_date`, `currency`

**transactions**: `account_id` (FK), `amount`, `category`, `description`, `date`

**portfolio_positions**: `ticker` (unique), `shares`, `avg_cost`

**plans**: `title`, `category`, `status`, `progress` (0–100 check constraint), `target_date`

**milestones**: `plan_id` (FK), `title`, `completed`, `due_date`, `completed_at`

**study_paths**: `subject`, `difficulty`, `progress`

**study_topics**: `path_id` (FK), `title`, `order`, `mastery_level`, `feynman_explanation`

**products**: `name`, `category`, `source_platform`, `source_price`, `target_platform`, `target_price`, `estimated_profit`, `roi_pct`, `status`

**orders**: `product_id` (FK), `platform`, `order_type` (buy/sell), `amount`, `fees`, `status`, `tracking`

## Deployment

- **Backend**: Railway — Docker build from `the-council/backend/Dockerfile`. Non-root `appuser`. `wait_for_db`: 10 retries, 0.5s base delay (~3 min window) for PostgreSQL cold-start.
- **Frontend**: Vercel — Next.js, root dir `the-council/frontend`, env var `BACKEND_URL=https://...railway.app` (must include `https://`).
- **Database**: Railway PostgreSQL plugin — auto-injects `DATABASE_URL`; `config.py` auto-fixes `postgres://` → `postgresql+asyncpg://`.
- **Only manual env var needed on Railway**: `ANTHROPIC_API_KEY`.
- `railway.toml` at repo root: `healthcheckPath="/api/health"`, `healthcheckTimeout=120`, `restartPolicyMaxRetries=15`.

## Common Patterns

### Testing Agent Behavior
1. Modify agent config in `registry.py` (voice, core_belief, instruction, temperature)
2. Restart backend (`uvicorn` auto-reloads with `--reload`)
3. Start new debate to test

### Debugging Streaming Issues
- Check `orchestrator.py` SSE event formatting (`_sse()` method)
- Verify frontend SSE listener in `lib/api.ts`
- Use browser DevTools Network tab to inspect SSE stream

### Changing Model Selection
Edit `backend/app/config.py`:
- `model_router` - Agent selection logic
- `model_chat` - Default agent responses
- `model_deep` - Synthesis

Override per-agent via `temperature` in `AgentConfig`.

## Design Principles

1. **No LangChain**: Direct Anthropic SDK for full control, less abstraction, better performance
2. **Tiered Models**: Right model for right task (Haiku routing < Sonnet chat < Opus synthesis)
3. **Sequential Context**: Each agent sees all prior responses in the debate for coherent multi-agent dialogue
4. **SSE over WebSocket**: Unidirectional streaming is simpler, sufficient for this use case
5. **Async Everything**: FastAPI + SQLAlchemy async + Anthropic async streaming
6. **Agent as Data**: Agents are pure configuration (dataclasses), no code per agent
7. **Constitution + Dossier**: Shared context ensures all agents follow same rules and understand user
