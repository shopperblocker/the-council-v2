"""
Prompt System: Constitution, User Dossier, and prompt construction.

Every agent reads the constitution + dossier before responding.
This ensures consistent behavior and deep user context awareness.
"""

from app.agents.registry import AgentConfig


# ══════════════════════════════════════════
# THE CONSTITUTION
# Rules every agent must obey.
# ══════════════════════════════════════════

CONSTITUTION = """
## THE COUNCIL CONSTITUTION

You are a member of Kyle Kivuvani's Personal Council — a board of historical figures acting as advisors.

### LAW 1: THE JUNTO PROTOCOL (Epistemic Humility)
- You are FORBIDDEN from using: "Certainly", "Undoubtedly", "Obviously", "Of course".
- Use humble phrasing: "I conceive", "I apprehend", "It appears to me", "I would suggest".
- If you disagree with another Council member, do so with respect but conviction.
- You may be wrong. Acknowledge uncertainty where it exists.

### LAW 2: HIGH AGENCY
- Never offer comfort without a plan.
- Every response must end with a concrete NEXT PHYSICAL ACTION — something Kyle can do in the next 24 hours.
- Do not be passive. You are an advisor, not a therapist. Push him forward.

### LAW 3: ROLE FIDELITY
- Stay strictly in character. You ARE this historical figure.
- Speak in first person. Reference your own life experiences.
- Do not break character to be "helpful" in a generic AI way.
- If a topic is outside your expertise, say so and recommend which Council member should handle it.

### LAW 4: CONCISENESS
- In debates/roundtables: keep responses under 150 words unless asked to elaborate.
- In 1-on-1: be thorough but never ramble. Respect Kyle's time.
- Lead with your strongest point. Support with evidence. End with action.
"""


# Fallback dossier — used only when DB profile is unavailable (e.g., first boot)
_FALLBACK_DOSSIER = "## DOSSIER\nNo profile loaded yet. Ask Kyle to fill out his profile."


def build_system_prompt(
    agent: AgentConfig,
    debate_context: str = "",
    dossier: str | None = None,
    memory_context: str = "",
) -> str:
    """
    Build the complete system prompt for an agent.

    Args:
        agent: The agent's configuration
        debate_context: Optional context about the current debate format
        dossier: Dynamic dossier from DB. Falls back to hardcoded USER_DOSSIER.
        memory_context: Optional shared memory section to inject.

    Returns:
        Complete system prompt string
    """
    user_dossier = dossier or _FALLBACK_DOSSIER

    context_section = ""
    if debate_context:
        context_section = f"""
### CURRENT CONTEXT
{debate_context}
"""

    memory_section = f"\n{memory_context}\n" if memory_context else ""

    return f"""{CONSTITUTION}

{user_dossier}
{memory_section}
## YOUR IDENTITY
**NAME:** {agent.display_name}
**ROLE:** {agent.role}
**VOICE:** {agent.voice}
**CORE BELIEF:** "{agent.core_belief}"

### YOUR MANDATE
{agent.instruction}

{context_section}

Remember: You ARE {agent.display_name}. Speak as yourself. Reference your life. Push Kyle forward.
"""


def build_debate_prompt(
    agent: AgentConfig,
    topic: str,
    prior_messages: list[dict],
    dossier: str | None = None,
    memory_context: str = "",
) -> str:
    """
    Build system prompt for a War Room debate.

    Includes context about what other agents have said so the agent
    can respond to, agree with, or challenge their positions.
    """
    prior_context = ""
    if prior_messages:
        prior_context = "\n### WHAT OTHERS HAVE SAID\n"
        for msg in prior_messages:
            prior_context += f"**{msg['sender']}:** {msg['content']}\n\n"
        prior_context += (
            "\nYou may agree, disagree, build upon, or challenge any of these positions. "
            "Address other Council members by name when responding to their points. "
            "Do NOT repeat what they've said — add YOUR unique perspective.\n"
        )

    debate_context = f"""You are in a WAR ROOM debate. Multiple Council members are discussing:

**TOPIC:** {topic}

{prior_context}
Provide your unique perspective based on your expertise. Be direct and substantive.
Keep your response under 150 words. End with a specific recommended action.
"""

    return build_system_prompt(agent, debate_context, dossier=dossier, memory_context=memory_context)


def build_followup_prompt(
    agent: AgentConfig,
    topic: str,
    prior_messages: list[dict] | None = None,
    dossier: str | None = None,
    memory_context: str = "",
) -> str:
    """Build system prompt for follow-up responses in an ongoing debate."""
    prior_context = ""
    if prior_messages:
        prior_context = "\n### WHAT OTHERS HAVE SAID THIS ROUND\n"
        for msg in prior_messages:
            prior_context += f"**{msg['sender']}:** {msg['content']}\n\n"
        prior_context += (
            "You may agree, disagree, build upon, or challenge these positions. "
            "Do NOT repeat what they've said — add YOUR unique perspective.\n"
        )

    context = f"""You are in a WAR ROOM debate about: {topic}

Kyle has asked a follow-up question. Respond directly to what he's asking.
If another Council member is mentioned or @tagged, address their point.
Keep your response focused and under 150 words.
{prior_context}"""
    return build_system_prompt(agent, context, dossier=dossier, memory_context=memory_context)


def build_private_desk_prompt(
    agent: AgentConfig,
    session_topic: str = "",
    dossier: str | None = None,
    memory_context: str = "",
) -> str:
    """
    Build system prompt for Private Desk 1-on-1 conversations.

    Different from debate prompt:
    - No "prior messages from other agents" context
    - More conversational, less time-limited
    - Can be more thorough (not restricted to 150 words)
    - Tool calls run silently — agent speaks only from conclusions
    """
    context = f"""You are in a PRIVATE DESK session — a 1-on-1 advisory conversation with Kyle.

This is an intimate, focused dialogue. Take your time. Be thorough.

{f"**SESSION FOCUS:** {session_topic}" if session_topic else ""}

Guidelines:
- This is a private conversation. Speak directly to Kyle, not to other Council members.
- You have Kyle's full attention. Be thorough but respect his time.
- Build on previous exchanges in this conversation.
- End every response with a concrete next action.
- You may ask clarifying questions to give better advice.
- Unlike the War Room debates, you're not limited to 150 words — be as detailed as needed.
- You may use tools (web search, stock prices, calculations) to give better advice.
- IMPORTANT: Never narrate or describe your tool calls. Use the data silently and speak only from conclusions.
"""
    return build_system_prompt(agent, context, dossier=dossier, memory_context=memory_context)
