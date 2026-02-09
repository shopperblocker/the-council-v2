"""
AI Service: Direct Anthropic SDK integration.

Replaces LangChain entirely. Cleaner, faster, full control.
Uses async streaming for real-time token delivery.
"""

import anthropic
from typing import AsyncIterator
from app.config import get_settings


class AIService:
    """Handles all communication with Claude models."""

    def __init__(self):
        settings = get_settings()
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model_router = settings.model_router
        self.model_chat = settings.model_chat
        self.model_deep = settings.model_deep

    async def generate(
        self,
        system_prompt: str,
        messages: list[dict],
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str:
        """
        Generate a complete response (non-streaming).

        Used for routing decisions, quick classifications, and synthesis.
        """
        response = await self.client.messages.create(
            model=model or self.model_chat,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=messages,
        )
        return response.content[0].text

    async def stream(
        self,
        system_prompt: str,
        messages: list[dict],
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """
        Stream response tokens as they're generated.

        Used for agent chat responses — delivers tokens to the frontend
        via SSE for real-time typing effect.
        """
        async with self.client.messages.stream(
            model=model or self.model_chat,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def route_query(self, question: str, available_agents: list[dict]) -> list[str]:
        """
        Use Haiku to intelligently route a question to the right agents.

        This replaces the keyword-matching router with actual intelligence.
        Fast and cheap with Haiku.
        """
        agent_descriptions = "\n".join(
            f"- {a['name']}: {a['role']} — {a['voice']} (Board: {a['board']})"
            for a in available_agents
        )

        prompt = f"""Given this question from Kyle, select 2-4 agents who should participate in the debate.

QUESTION: {question}

AVAILABLE AGENTS:
{agent_descriptions}

Rules:
- Pick agents whose expertise is MOST relevant
- Include diverse perspectives (don't pick all from one board)
- For financial questions, always include Rockefeller
- For strategic questions, include Napoleon or Bismarck
- For personal/emotional questions, include Marcus_Aurelius or Frankl
- For learning questions, include Feynman
- Order them by who should speak FIRST (most relevant first)

Respond with ONLY a JSON array of agent names, like: ["Rockefeller", "Napoleon", "Marcus_Aurelius"]
No explanation. Just the JSON array."""

        response = await self.generate(
            system_prompt="You are an intelligent query router. Respond only with a JSON array.",
            messages=[{"role": "user", "content": prompt}],
            model=self.model_router,
            max_tokens=200,
            temperature=0.0,
        )

        # Parse the JSON array from response
        import json
        try:
            # Handle potential markdown wrapping
            cleaned = response.strip().strip("`").strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            agents = json.loads(cleaned)
            if isinstance(agents, list) and all(isinstance(a, str) for a in agents):
                return agents[:5]  # Cap at 5
        except (json.JSONDecodeError, ValueError):
            pass

        # Fallback: return first 3 agents
        return [a["name"] for a in available_agents[:3]]

    async def synthesize_debate(
        self,
        topic: str,
        messages: list[dict],
    ) -> str:
        """
        Use Opus to synthesize a debate into actionable insights.

        Identifies agreements, disagreements, and recommended actions.
        """
        conversation = "\n\n".join(
            f"**{m['sender']}:** {m['content']}" for m in messages if m['sender_type'] == 'agent'
        )

        prompt = f"""Synthesize this Council debate into actionable insight for Kyle.

TOPIC: {topic}

DEBATE:
{conversation}

Provide:
1. **CONSENSUS** — What do they agree on? (2-3 sentences)
2. **TENSIONS** — Where do they disagree? Why? (2-3 sentences)
3. **RECOMMENDED ACTION** — What should Kyle do in the next 24 hours? (1-2 specific steps)

Be concise. No filler. Kyle needs clarity, not more words."""

        return await self.generate(
            system_prompt="You are a debate synthesizer for The Council. Be concise and actionable.",
            messages=[{"role": "user", "content": prompt}],
            model=self.model_deep,
            max_tokens=500,
            temperature=0.3,
        )


# Singleton
_ai_service: AIService | None = None

def get_ai_service() -> AIService:
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service
