---
name: debug-sse
description: Debug SSE streaming issues, tool use hangs, session errors, or stock data problems in The Council backend. Use when something is stuck, not responding, or returning wrong data.
disable-model-invocation: true
allowed-tools: Read, Grep, Bash(curl *), Bash(python3 *)
---

# Debugging The Council v2 — SSE & Tool Use

## Architecture Overview

```
Frontend (Vercel/Next.js)
  └── fetch() POST with ReadableStream (NOT EventSource — can't POST)
        └── Railway (FastAPI)
              └── StreamingResponse(generate())
                    └── private_desk_orchestrator.py
                          └── ai.py:stream_with_tools()
                                └── Anthropic SDK streaming loop
                                      └── tools.py:execute_tool() via asyncio.to_thread
```

SSE format: `event: <type>\ndata: <json>\n\n`
Event types: `conversation_start`, `agent_start`, `agent_token`, `tool_call`, `conversation_end`, `error`

---

## Known Bugs & Fixes

### Bug: Stuck at "🔍 Searching..." or "📈 Getting price..."

**Symptom**: Tool call indicator appears, then nothing for 30+ seconds or forever.

**Cause A — Duplicate `stream_with_tools` in ai.py**
Python silently uses the LAST definition. If there are two `stream_with_tools` methods, only the second one runs. Verify there's exactly ONE:
```bash
grep -n "def stream_with_tools" the-council/backend/app/services/ai.py
```
Should return exactly one line.

**Cause B — Blocking I/O on the event loop**
`yfinance`, `urllib.request`, and any synchronous HTTP library blocks the entire async event loop when called directly in an `async def`. SSE events can't be sent while the loop is blocked.

Fix: All tool execution must go through `asyncio.to_thread`:
```python
result = await asyncio.to_thread(_run_sync_tool, block.name, tool_input)
```
And `_run_sync_tool` creates its own event loop in the thread:
```python
def _run_sync_tool(name, tool_input):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_execute_tool_async(name, tool_input))
    finally:
        loop.close()
```

**Cause C — No `tools=` on second streaming call**
If `stream_with_tools` does a non-streaming first call to detect tools, then a streaming second call WITHOUT `tools=`, Claude may behave unexpectedly. The correct implementation uses a single streaming loop with `tools=` on EVERY call.

---

### Bug: "Error: Session not found" on follow-up messages

**Symptom**: First message works, second message returns "Session not found".

**Cause**: Session was `flush()`ed (assigned an ID) but never `commit()`ted before streaming started. A new DB connection in the follow-up request can't see uncommitted data.

**Fix**: In `private_desk_orchestrator.py`, call `await db.commit()` right after saving the initial session + user message, BEFORE yielding the first SSE event:
```python
db.add(session)
await db.flush()
db.add(user_msg)
await db.commit()  # ← MUST be here, before streaming starts
# ... now yield events
```
Also commit after saving the agent response.

---

### Bug: Agent says "Mock Data" or "I don't have live market access"

**Cause A — web_search mock contains "mock data" text**
The agent reads the tool result and faithfully reports it. Never put "mock", "fake", or "test data" in tool responses. Check:
```bash
grep -n "mock\|fake\|test data" the-council/backend/app/services/tools.py
```

**Cause B — yfinance returns None or fails on Railway**
Yahoo Finance rate-limits/blocks cloud server IPs. `fast_info.last_price` returns `None`.

Fix chain in `get_stock_price`:
1. `yfinance fast_info.last_price` — fast, may be None
2. `yfinance stock.history(period="2d")` — more reliable
3. Direct `urllib.request` to `query1.finance.yahoo.com/v8/finance/chart/{ticker}` with browser User-Agent

**Cause C — get_stock_price returns `{"error": "..."}` dict**
Claude reads the error key and announces it can't access data. On all failures, return `{"unavailable": True, "reason": "..."}` instead — less alarming to the agent.

---

### Bug: Frontend shows nothing / stream never starts

**Check 1 — CORS**: Railway must allow Vercel's domain.
```python
cors_origins: str = "http://localhost:3000,https://the-council-v2.vercel.app"
```

**Check 2 — API_BASE in api.ts**: Must use env var, not hardcoded URL.
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
```
If `NEXT_PUBLIC_API_URL` isn't set in Vercel dashboard, it falls back to localhost — which never works from a deployed site.

**Check 3 — Railway deployment**: Railway deploys from `main`. If your changes are only on the feature branch, they're not deployed yet. Merge the PR first.

---

## Quick Diagnostic Checklist

```bash
# 1. Is backend running?
curl https://the-council-backend-production-e480.up.railway.app/health

# 2. Are agents loading?
curl https://the-council-backend-production-e480.up.railway.app/api/private-desk/agents

# 3. Exactly one stream_with_tools?
grep -n "def stream_with_tools" the-council/backend/app/services/ai.py

# 4. Commits happening before streaming?
grep -n "await db.commit\|await db.flush" the-council/backend/app/services/private_desk_orchestrator.py

# 5. No mock text in tool responses?
grep -n "mock\|fake\|test data" the-council/backend/app/services/tools.py

# 6. Tool I/O going through asyncio.to_thread?
grep -n "asyncio.to_thread\|to_thread" the-council/backend/app/services/ai.py
```

---

## SSE Event Flow (expected happy path)

```
POST /api/private-desk/conversation
  → event: conversation_start  {"session_id": "...", "agent": "Rockefeller", ...}
  → event: tool_call            {"tool": "web_search"}       # if tool used
  → event: tool_call            {"tool": "get_stock_price"}  # may repeat
  → event: agent_token          {"token": "Kyle, "}          # streams word by word
  → event: agent_token          {"token": "here are..."}
  → event: conversation_end     {"session_id": "...", "message_count": 2}

POST /api/private-desk/session/{id}/message
  → event: agent_start          {"agent": "Rockefeller", ...}
  → event: agent_token          ...
  → event: conversation_end     ...
```

If `conversation_end` never arrives, the frontend stays in loading state indefinitely.
