"""
Content Studio Routes: AI-powered content creation tools with SSE streaming.

Tools: TikTok hooks, captions, video concepts, failure analysis, full scripts.
"""

import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.services.ai import get_ai_service
from app.agents.registry import get_agent

router = APIRouter(prefix="/api/content", tags=["content"])


# ── Request Schemas ──

class HooksRequest(BaseModel):
    niche: str
    topic: str
    count: int = 10


class CaptionsRequest(BaseModel):
    content_summary: str
    platform: str
    tone: Optional[str] = None


class ConceptsRequest(BaseModel):
    niche: str
    audience: str
    count: int = 5


class AnalyzeFailuresRequest(BaseModel):
    metrics: str
    content_description: str


class ScriptRequest(BaseModel):
    topic: str
    hook_style: Optional[str] = None
    duration: Optional[str] = None


# ── SSE Streaming Helper ──

async def _stream_ai_response(system_prompt: str, user_message: str, agent_name: str, agent_config, temperature: float = 0.7):
    """Stream an AI response as SSE events using a Council agent persona."""
    ai = get_ai_service()

    yield f"event: agent_start\ndata: {json.dumps({'agent': agent_name, 'display_name': agent_config.display_name, 'emoji': agent_config.emoji, 'color': agent_config.color})}\n\n"

    full = ""
    async for token in ai.stream(
        system_prompt=system_prompt,
        messages=[{"role": "user", "content": user_message}],
        temperature=temperature,
    ):
        full += token
        yield f"event: agent_token\ndata: {json.dumps({'agent': agent_name, 'token': token})}\n\n"

    yield f"event: agent_end\ndata: {json.dumps({'agent': agent_name})}\n\n"
    yield f"event: round_end\ndata: {json.dumps({'message_count': 1})}\n\n"


# ── Endpoints ──

@router.post("/hooks")
async def generate_hooks(req: HooksRequest):
    """Generate TikTok/short-form hooks. Streamed via SSE using Madam Walker."""
    agent = get_agent("Madam_Walker")

    system_prompt = f"""You are {agent.display_name}, {agent.role} of The Council.
Your voice: {agent.voice}

You are a master of attention-grabbing hooks for short-form video content.

Generate exactly {req.count} hooks for a {req.niche} creator. Each hook should:
- Stop the scroll in the first 1-2 seconds
- Create curiosity or urgency
- Be specific (not generic clickbait)
- Work for TikTok, Reels, and Shorts

Format each hook as a numbered list. After the hooks, add a brief section:

## Hook Psychology
Explain which psychological triggers you used and why they work for this niche.

## Filming Tips
1-2 sentences on how to deliver these hooks on camera for maximum impact.
"""

    user_message = f"Generate {req.count} scroll-stopping hooks for a {req.niche} creator about: {req.topic}"

    async def generate():
        async for event in _stream_ai_response(system_prompt, user_message, agent.name, agent, temperature=0.8):
            yield event

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/captions")
async def generate_captions(req: CaptionsRequest):
    """Generate social media captions. Streamed via SSE using Madam Walker."""
    agent = get_agent("Madam_Walker")

    tone_instruction = f"Tone: {req.tone}." if req.tone else "Use a tone appropriate for the platform."

    system_prompt = f"""You are {agent.display_name}, {agent.role} of The Council.
Your voice: {agent.voice}

You are writing captions optimized for {req.platform}. {tone_instruction}

Generate 3 caption variations:
## Caption 1: The Hook-First
Lead with the most attention-grabbing line.

## Caption 2: The Story
Use micro-storytelling to draw the reader in.

## Caption 3: The CTA-Heavy
Focused on driving engagement (comments, shares, saves).

For each caption include:
- The caption text (with line breaks and emojis where appropriate)
- Suggested hashtags (5-10, mix of broad and niche)
- Best posting time suggestion

Optimize for {req.platform}'s algorithm and culture.
"""

    user_message = f"Write captions for this content: {req.content_summary}"

    async def generate():
        async for event in _stream_ai_response(system_prompt, user_message, agent.name, agent, temperature=0.8):
            yield event

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/concepts")
async def generate_concepts(req: ConceptsRequest):
    """Brainstorm video concepts. Streamed via SSE using Da Vinci (creative polymath)."""
    agent = get_agent("Da_Vinci")

    system_prompt = f"""You are {agent.display_name}, {agent.role} of The Council.
Your voice: {agent.voice}

You are brainstorming video content concepts for a {req.niche} creator targeting {req.audience}.

Generate exactly {req.count} video concepts. For each concept provide:

### Concept [N]: [Title]
- **Hook:** The opening line/visual (first 2 seconds)
- **Core Idea:** What the video is about (1-2 sentences)
- **Format:** (talking head, skit, tutorial, storytime, duet, etc.)
- **Estimated Length:** (15s, 30s, 60s, 3min)
- **Virality Factor:** Why this could take off (what makes it shareable)

After all concepts, add:
## Content Calendar Suggestion
How to sequence these concepts over the next 1-2 weeks for maximum momentum.

Think like an artist — find the unexpected angle. The obvious idea is the wrong idea.
"""

    user_message = f"Generate {req.count} video concepts for a {req.niche} creator targeting {req.audience}."

    async def generate():
        async for event in _stream_ai_response(system_prompt, user_message, agent.name, agent, temperature=0.9):
            yield event

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/analyze-failures")
async def analyze_failures(req: AnalyzeFailuresRequest):
    """Analyze failed content. Streamed via SSE using Feynman (analytical explainer)."""
    agent = get_agent("Feynman")

    system_prompt = f"""You are {agent.display_name}, {agent.role} of The Council.
Your voice: {agent.voice}

You are analyzing why content underperformed. Be analytical and specific — no hand-waving.

Structure your analysis:

## The Numbers Don't Lie
Break down what the metrics actually tell us. Compare to typical benchmarks.

## Root Cause Analysis
What specifically went wrong? Consider:
- Hook quality (did they stop scrolling?)
- Retention (where did they drop off and why?)
- Topic-market fit (was the audience even interested?)
- Timing and algorithm factors
- Production quality issues

## The Feynman Fix
Explain the core problem so simply that a 10-year-old could understand it.

## Recovery Plan
3 specific changes for the next piece of content, ordered by expected impact.

## The Experiment
Design a simple A/B test Kyle can run to validate the fix.

Be curious, not judgmental. Failed content is data, not failure.
"""

    user_message = f"Analyze this underperforming content.\n\nMetrics: {req.metrics}\n\nContent description: {req.content_description}"

    async def generate():
        async for event in _stream_ai_response(system_prompt, user_message, agent.name, agent, temperature=0.6):
            yield event

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/script")
async def generate_script(req: ScriptRequest):
    """Generate a full video script. Streamed via SSE using Ben Franklin (pragmatic executor)."""
    agent = get_agent("Ben_Franklin")

    hook_instruction = f"Hook style preference: {req.hook_style}." if req.hook_style else ""
    duration_instruction = f"Target duration: {req.duration}." if req.duration else "Target duration: 60-90 seconds."

    system_prompt = f"""You are {agent.display_name}, {agent.role} of The Council.
Your voice: {agent.voice}

You are writing a complete video script. {hook_instruction} {duration_instruction}

Structure the script exactly like this:

## HOOK (0-3 seconds)
[The opening line — must stop the scroll. Write 2-3 options.]

## SETUP (3-10 seconds)
[Frame the problem or promise. Create stakes.]

## BODY (10-45 seconds)
[The main content. Break into clear beats. Number each beat.]
[Include visual/action directions in brackets like [CUT TO: close-up]]

## CLIMAX (45-55 seconds)
[The "aha moment" or key payoff.]

## CTA (55-60 seconds)
[Clear call to action — what should the viewer do next?]

---

## Production Notes
- Camera angles and cuts
- Music/sound suggestions
- Text overlay recommendations
- Thumbnail concept

Write it so Kyle can film it TODAY with just a phone. Practical above all.
"""

    user_message = f"Write a complete video script about: {req.topic}"

    async def generate():
        async for event in _stream_ai_response(system_prompt, user_message, agent.name, agent, temperature=0.7):
            yield event

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
