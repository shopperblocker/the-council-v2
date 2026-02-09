# 🏛️ The Council v2.0

Multi-Agent AI Advisory Platform — rebuilt from scratch.

**Stack:** FastAPI + Next.js + PostgreSQL + Anthropic SDK (no LangChain)

## Architecture

```
┌─────────────────────────────────────────────────┐
│  FRONTEND (Next.js + React + Tailwind)          │
│  ├── Landing page ("Choose Your Table")         │
│  ├── War Room (multi-agent debate)              │
│  └── SSE streaming for real-time responses      │
│                                                 │
│  ↕  API calls + Server-Sent Events              │
│                                                 │
│  BACKEND (FastAPI + Python)                     │
│  ├── Routes (REST + SSE streaming)              │
│  ├── Orchestrator (debate flow management)      │
│  ├── AI Service (Anthropic SDK direct)          │
│  ├── Agent Registry (12 agents, 4 boards)       │
│  └── Prompt System (constitution + dossier)     │
│                                                 │
│  ↕  async queries                               │
│                                                 │
│  DATABASE (PostgreSQL)                          │
│  ├── sessions                                   │
│  ├── messages                                   │
│  ├── shared_memory                              │
│  └── insights                                   │
└─────────────────────────────────────────────────┘
```

## AI Model Strategy

| Model | Use Case | Why |
|-------|----------|-----|
| **Haiku 4.5** | Query routing, classification | Fast (<1s), cheap |
| **Sonnet 4.5** | Agent chat responses | Quality + speed balance |
| **Opus 4.6** | Debate synthesis, deep analysis, note extraction | Maximum intelligence |

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- Docker (for PostgreSQL)

### 1. Start PostgreSQL
```bash
docker compose up -d
```

### 2. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Run
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Open
Navigate to `http://localhost:3000`

## Project Structure

```
the-council/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, startup
│   │   ├── config.py            # Pydantic settings
│   │   ├── database.py          # SQLAlchemy async + PostgreSQL
│   │   ├── models.py            # ORM models (sessions, messages, etc.)
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── agents/
│   │   │   ├── registry.py      # 12 agents across 4 boards
│   │   │   └── prompts.py       # Constitution, dossier, prompt builder
│   │   ├── services/
│   │   │   ├── ai.py            # Anthropic SDK — streaming, routing, synthesis
│   │   │   └── orchestrator.py  # War Room debate flow + SSE events
│   │   └── routes/
│   │       └── war_room.py      # API endpoints (debate, follow-up, sessions)
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Landing — "Choose Your Table"
│   │   ├── globals.css          # Glassmorphism + animations
│   │   └── war-room/
│   │       └── page.tsx         # War Room experience
│   ├── components/
│   │   ├── GlassPanel.tsx       # Reusable glass container
│   │   ├── ChatMessage.tsx      # Message bubble with agent colors
│   │   └── AgentCard.tsx        # Agent info card
│   ├── lib/
│   │   ├── api.ts               # API client with SSE streaming
│   │   └── types.ts             # TypeScript types
│   └── package.json
│
├── docker-compose.yml           # PostgreSQL
└── README.md
```

## How the War Room Works

1. **User asks a question** → Frontend sends POST to `/api/war-room/debate`
2. **Haiku routes** → Selects 2-4 relevant agents based on question
3. **Agents speak in sequence** → Each gets full context of prior responses
4. **Responses stream** → SSE delivers tokens in real-time (typing effect)
5. **User can follow up** → Same session, agents respond with full history
6. **@mentions** → Direct a question to a specific agent

## Key Design Decisions

- **No LangChain** — Anthropic SDK handles tool calling natively. Cleaner, faster, less abstraction.
- **SSE not WebSocket** — Simpler for unidirectional streaming. POST-based (EventSource doesn't support POST).
- **PostgreSQL** — Scales to multi-user SaaS when ready. Async with SQLAlchemy 2.0.
- **Tiered models** — Use the right model for the right task. Haiku for routing, Sonnet for chat, Opus for depth.
- **Glassmorphism** — Premium visual layer. Light backgrounds, blur effects, agent-specific colors.

## What's Next

- [ ] Private Desk (1-on-1 mode)
- [ ] Academy (adaptive learning)
- [ ] Workshop (collaborative tools)
- [ ] Financial Command Center
- [ ] Plans Hub
- [ ] Autonomous Note Analysis (file watcher + Opus extraction)
- [ ] MCP integration
- [ ] Deploy to Vercel + Railway
