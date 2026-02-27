"""
Workshop Routes: AI-powered strategic tools with SSE streaming.

Tools: SWOT analysis, revenue model generation, multi-agent brainstorm, pitch review.
"""

import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.services.ai import get_ai_service
from app.agents.registry import get_agent, get_board_agents, Board

router = APIRouter(prefix="/api/workshop", tags=["workshop"])


# ── Request Schemas ──

class SwotRequest(BaseModel):
    topic: str
    context: Optional[str] = None


class RevenueModelRequest(BaseModel):
    business: str
    details: Optional[str] = None


class BrainstormRequest(BaseModel):
    idea: str
    context: Optional[str] = None


class PitchReviewRequest(BaseModel):
    pitch: str


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

@router.post("/swot")
async def swot_analysis(req: SwotRequest):
    """Generate a SWOT analysis. Streamed via SSE using Bismarck (the strategist)."""
    agent = get_agent("Bismarck")

    system_prompt = f"""You are {agent.display_name}, {agent.role} of The Council.
Your voice: {agent.voice}

You are conducting a SWOT analysis — a strategic framework examining Strengths, Weaknesses, Opportunities, and Threats.

Format your response clearly with these four sections using markdown headers:
## Strengths
## Weaknesses
## Opportunities
## Threats

After the SWOT matrix, provide a **Strategic Recommendation** section with 2-3 concrete next steps.

Be specific, analytical, and actionable. No generic filler. Every point should be tied to the specific topic provided.
"""

    context_note = f"\n\nAdditional context: {req.context}" if req.context else ""
    user_message = f"Conduct a SWOT analysis on: {req.topic}{context_note}"

    async def generate():
        async for event in _stream_ai_response(system_prompt, user_message, agent.name, agent, temperature=0.6):
            yield event

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/revenue-model")
async def revenue_model(req: RevenueModelRequest):
    """Generate a revenue model. Streamed via SSE using Rockefeller (the CFO)."""
    agent = get_agent("Rockefeller")

    system_prompt = f"""You are {agent.display_name}, {agent.role} of The Council.
Your voice: {agent.voice}

You are building a revenue model — a detailed breakdown of how a business can generate income.

Structure your analysis with:
## Revenue Streams
Identify 3-5 potential revenue streams with estimated potential.

## Cost Structure
Break down fixed vs. variable costs. Be specific with numbers where possible.

## Unit Economics
Calculate per-unit revenue, cost, and margin. Include break-even analysis.

## Growth Levers
What actions would 2x or 10x revenue? Be specific.

## 90-Day Revenue Target
Give a realistic first-quarter revenue projection with assumptions stated.

Think in numbers. Every claim should have a dollar figure or percentage attached.
"""

    details_note = f"\n\nAdditional details: {req.details}" if req.details else ""
    user_message = f"Build a revenue model for: {req.business}{details_note}"

    async def generate():
        async for event in _stream_ai_response(system_prompt, user_message, agent.name, agent, temperature=0.7):
            yield event

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/brainstorm")
async def brainstorm(req: BrainstormRequest):
    """Multi-agent brainstorm session. Multiple agents weigh in via SSE stream."""
    # Use a diverse set of agents for brainstorming
    agents_to_use = [
        get_agent("Madam_Walker"),   # Hustler — sales/distribution angle
        get_agent("Steve_Jobs"),      # Perfectionist — product/focus angle
        get_agent("Da_Vinci"),        # Polymath — creative/cross-domain angle
        get_agent("Rockefeller"),     # CFO — financial viability angle
    ]
    agents_to_use = [a for a in agents_to_use if a is not None]

    context_note = f"\n\nAdditional context: {req.context}" if req.context else ""
    user_message = f"Brainstorm on this idea: {req.idea}{context_note}"

    async def generate():
        ai = get_ai_service()
        prior_responses = []

        for agent in agents_to_use:
            # Build a prompt that includes what prior agents said
            prior_context = ""
            if prior_responses:
                prior_context = "\n\n### What other Council members have said:\n"
                for prev_name, prev_content in prior_responses:
                    prior_context += f"**{prev_name}:** {prev_content}\n\n"
                prior_context += "Build on, challenge, or extend their ideas. Do NOT repeat them.\n"

            system_prompt = f"""You are {agent.display_name}, {agent.role} of The Council.
Your voice: {agent.voice}
Core belief: "{agent.core_belief}"

You are in a brainstorming session. Contribute your unique perspective based on your expertise.
Be creative, specific, and actionable. Keep your response under 200 words.
End with one concrete suggestion Kyle can act on immediately.
{prior_context}"""

            # Emit agent_start
            yield f"event: agent_start\ndata: {json.dumps({'agent': agent.name, 'display_name': agent.display_name, 'emoji': agent.emoji, 'color': agent.color})}\n\n"

            full = ""
            async for token in ai.stream(
                system_prompt=system_prompt,
                messages=[{"role": "user", "content": user_message}],
                temperature=agent.temperature,
            ):
                full += token
                yield f"event: agent_token\ndata: {json.dumps({'agent': agent.name, 'token': token})}\n\n"

            yield f"event: agent_end\ndata: {json.dumps({'agent': agent.name})}\n\n"

            prior_responses.append((agent.display_name, full))

        yield f"event: round_end\ndata: {json.dumps({'message_count': len(agents_to_use)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/pitch-review")
async def pitch_review(req: PitchReviewRequest):
    """Review a pitch. Streamed via SSE using Steve Jobs (the Perfectionist)."""
    agent = get_agent("Steve_Jobs")

    system_prompt = f"""You are {agent.display_name}, {agent.role} of The Council.
Your voice: {agent.voice}

You are reviewing a pitch — tearing it apart and rebuilding it stronger.

Structure your review:
## First Impression
Your gut reaction in 1-2 sentences. Be brutally honest.

## What Works
The strongest elements. Be specific about why they work.

## What Doesn't Work
The weak points. Explain why they fail and what the listener actually hears.

## The Missing Piece
What critical element is absent?

## Rewrite
Provide a tightened, punched-up version of the key pitch elements. Show, don't tell.

## The One Thing
If Kyle could only change ONE thing about this pitch, what should it be?

Be harsh but constructive. Mediocre is worse than bad — at least bad is memorable.
"""

    user_message = f"Review this pitch:\n\n{req.pitch}"

    async def generate():
        async for event in _stream_ai_response(system_prompt, user_message, agent.name, agent, temperature=0.7):
            yield event

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
