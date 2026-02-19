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
python -m uvicorn app.main:app --reload --port 8000   # Windows
uvicorn app.main:app --reload --port 8000              # Mac/Linux

# Terminal 2: Frontend (from frontend/)
npm run dev

# Access at http://localhost:3000
```

### Windows-Specific Notes
- Python 3.14: asyncpg 0.30.0 has no binary wheel — use `asyncpg==0.31.0` locally
- Scripts (uvicorn, fastapi) may not be on PATH — always use `python -m uvicorn` on Windows
- pip may default to user install (`C:\Users\<name>\AppData\Roaming\Python\...\Scripts`) — add to PATH or use `python -m` prefix

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

**Configuration**: `config.py` - Pydantic settings from `.env` (API keys, database URL, model choices)

**Database Layer**:
- `database.py` - Async SQLAlchemy engine with `asyncpg`, session management
- `models.py` - ORM models: `Session`, `Message`, `SharedMemory`, `Insight`
- Database auto-creates tables on startup via `init_db()` in lifespan

**Agent System** (`agents/`):
- `registry.py` - **Single source of truth** for all 12 agents. Each `AgentConfig` defines: name, role, emoji, color, voice, core_belief, instruction, specializations, temperature
- `prompts.py` - Constitution (behavioral laws all agents follow), User Dossier (context about Kyle), system prompt builders

**4 Boards**:
1. **War Room**: Rockefeller (CFO), Napoleon (Emperor), Bismarck (Chancellor), Madam Walker (Hustler)
2. **Clinic**: Marcus Aurelius (Stoic), Frankl (Meaning-Maker), Wim Hof (Iceman)
3. **Academy**: Feynman (Explainer), Da Vinci (Polymath), Socrates (Gadfly)
4. **Engine Room**: Ben Franklin (Pragmatist), Steve Jobs (Perfectionist)

**Services** (`services/`):
- `ai.py` - Direct Anthropic SDK wrapper. Methods:
  - `generate()` - Non-streaming responses (routing, classification)
  - `stream()` - Async token streaming for agent responses
  - `route_query()` - Uses Haiku to select 2-4 relevant agents for a question
  - `synthesize_debate()` - Uses Opus to summarize consensus/tensions/actions
- `orchestrator.py` - **War Room brain**:
  - `start_debate()` - Routes → creates session → streams agents sequentially with full prior context
  - `follow_up()` - Handles follow-up questions with conversation history, supports @mentions
  - Yields SSE-formatted events: `debate_start`, `agent_start`, `agent_token`, `agent_end`, `round_end`

**API Routes** (`routes/`):
- `war_room.py` - FastAPI endpoints:
  - `POST /api/war-room/debate` - Start new debate (SSE stream)
  - `POST /api/war-room/session/{session_id}/message` - Follow-up message in existing session (SSE stream)
  - `GET /api/war-room/session/{session_id}` - Retrieve session with full message history
  - `GET /api/war-room/sessions` - List recent War Room sessions (query param: `limit`)
  - `GET /api/war-room/agents` - List all available agents
  - `GET /api/war-room/agents/board/{board}` - List agents on a specific board
- `private_desk.py` - FastAPI endpoints:
  - `POST /api/private-desk/conversation` - Start a new 1-on-1 session (SSE stream)
  - `POST /api/private-desk/session/{session_id}/message` - Continue an existing session (SSE stream)
  - `GET /api/private-desk/session/{session_id}` - Retrieve session with full message history
  - `GET /api/private-desk/sessions` - List recent Private Desk sessions (query param: `limit`)
  - `GET /api/private-desk/agents` - List all agents available for Private Desk

### Frontend Structure (`frontend/`)

**Next.js App Router** (`app/`):
- `layout.tsx` - Root layout
- `page.tsx` - Landing page ("Choose Your Table")
- `globals.css` - Glassmorphism styling + animations
- `war-room/page.tsx` - War Room experience with SSE streaming

**Components** (`components/`):
- `GlassPanel.tsx` - Reusable glass container
- `ChatMessage.tsx` - Message bubbles with agent-specific colors
- `AgentCard.tsx` - Agent info cards

**Client Library** (`lib/`):
- `api.ts` - API client with SSE streaming support
- `types.ts` - TypeScript interfaces

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
Events emitted by orchestrator:
- `debate_start` - Session ID, agent list, topic
- `agent_start` - Agent metadata (name, display_name, emoji, color)
- `agent_token` - Individual token from agent response
- `agent_end` - Agent finished
- `round_end` - All agents finished this round
- `error` - Error message

Format: `event: {event_name}\ndata: {json_data}\n\n`

## Environment Configuration

**Backend `.env`** (required):
```bash
ANTHROPIC_API_KEY=sk-ant-xxxxx  # Required
DATABASE_URL=postgresql+asyncpg://council:council@localhost:5432/council
CORS_ORIGINS=http://localhost:3000
```

**Frontend `.env.local`** (local dev):
```bash
# No variables required — Next.js proxy rewrites /api/* to localhost:8000 automatically
```

## Deployment Checklist

### Railway (Backend)
| Variable | Example | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | From console.anthropic.com — verify key is active |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Railway provides this automatically |
| `CORS_ORIGINS` | `https://your-app.vercel.app` | Exact Vercel URL, no trailing slash |

### Vercel (Frontend)
| Variable | Example | Notes |
|---|---|---|
| `BACKEND_URL` | `https://your-app.up.railway.app` | **Must include `https://`** — missing protocol breaks the build |

### Branch Strategy
- All AI-assisted work happens on `claude/` branches
- Merge to `main` via GitHub PR (branch protection blocks direct push)
- Railway and Vercel both auto-deploy when `main` is updated
- Never push directly to `main`

## Database Schema

**sessions**:
- `id` (UUID, PK)
- `mode` (war_room, private_desk, junto)
- `topic` (text)
- `user_context` (JSON)
- `agents` (JSON array of agent names)
- `created_at` (timestamp)

**messages**:
- `id` (int, PK)
- `session_id` (UUID, FK to sessions)
- `sender` (user or agent name)
- `sender_type` (user or agent)
- `content` (text)
- `created_at` (timestamp)

**shared_memory**: Cross-session persistent facts
**insights**: Agent-generated autonomous insights

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
- `model_deep` - Synthesis (not actively used yet)

Override per-agent via `temperature` in `AgentConfig`.

## Design Principles

1. **No LangChain**: Direct Anthropic SDK for full control, less abstraction, better performance
2. **Tiered Models**: Right model for right task (Haiku routing < Sonnet chat < Opus synthesis)
3. **Sequential Context**: Each agent sees all prior responses in the debate for coherent multi-agent dialogue
4. **SSE over WebSocket**: Unidirectional streaming is simpler, sufficient for this use case
5. **Async Everything**: FastAPI + SQLAlchemy async + Anthropic async streaming
6. **Agent as Data**: Agents are pure configuration (dataclasses), no code per agent
7. **Constitution + Dossier**: Shared context ensures all agents follow same rules and understand user

## Future Development

Planned features (see README):
- Private Desk (1-on-1 agent mode)
- Academy (adaptive learning)
- Workshop (collaborative tools)
- Autonomous Note Analysis (file watcher + Opus extraction)
- MCP integration for tool use

When adding features, maintain the pattern of:
1. Configuration-driven agents (registry)
2. Shared prompt architecture (constitution + dossier)
3. Streaming responses with SSE
4. Persistent sessions in PostgreSQL
