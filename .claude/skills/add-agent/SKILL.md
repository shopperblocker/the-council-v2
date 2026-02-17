---
name: add-agent
description: Add a new historical figure or advisor to The Council. Use when the user wants to create a new agent, advisor, or historical figure character.
disable-model-invocation: true
allowed-tools: Read, Edit, Bash(git *)
---

# Adding a New Agent to The Council

## Files to modify
1. `the-council/backend/app/agents/registry.py` — define the agent
2. `the-council/backend/app/agents/prompts.py` — verify prompt builder handles it (usually no change needed)

## Step 1: Choose the right Board

```python
class Board(str, Enum):
    WAR_ROOM = "war_room"      # Strategy, Finance, Business, Power
    CLINIC = "clinic"           # Psychology, Wellbeing, Mindset
    ACADEMY = "academy"         # Knowledge, Science, Philosophy
    ENGINE_ROOM = "engine_room" # Tech, Operations, Systems
```

Pick the board that matches the figure's domain.

## Step 2: Add the AgentConfig

Add a `_register(AgentConfig(...))` call in `registry.py` under the correct board section.

### Required fields

```python
_register(AgentConfig(
    name="LastName",                    # Internal key — no spaces, PascalCase
    display_name="First Last",          # Full name shown in UI
    board=Board.WAR_ROOM,               # Pick from Board enum
    role="The [Title]",                 # Short role label (The CFO, The Strategist)
    emoji="🔥",                         # Single emoji for avatar
    color="#HEX",                       # Hex color for UI accent
    voice="[Style description]",        # How they speak — 1-2 sentences
    core_belief="[Philosophy]",         # Their central worldview — 1-2 sentences
    instruction=(
        "Detailed instructions for Claude on HOW to embody this figure. "
        "Include: what lens they see the world through, how they challenge Kyle, "
        "what historical experiences to reference, their signature phrases or style. "
        "3-5 sentences minimum. This shapes every response."
    ),
    specializations=["topic1", "topic2", "topic3"],  # For routing
    temperature=0.7,  # 0.5=consistent, 0.7=balanced, 0.9=creative/unpredictable
))
```

### Voice guidelines
- Be specific about tone: "Blunt and mathematical" not just "smart"
- Include contrasts: "Warm but unflinching about hard truths"
- Reference their era: "Speaks like a 19th-century industrialist, not a coach"

### Instruction guidelines
- Start with their analytical lens: "Analyze everything through [X]"
- Tell them what to challenge: "When Kyle [does X], push back by [doing Y]"
- Give them signature references: "Reference [specific event/work] when [relevant]"
- Define their relationship with Kyle: How direct? How much do they care?

## Step 3: Choose specializations

Used by the AI router to decide which agents to include in War Room debates.
Common tags: `finance`, `strategy`, `psychology`, `philosophy`, `science`,
`leadership`, `history`, `technology`, `writing`, `negotiation`, `resilience`

## Step 4: Verify

After adding, check the agent appears in:
```bash
# Start backend and hit the agents endpoint
curl http://localhost:8000/api/private-desk/agents | python3 -m json.tool | grep name
```

## Example: Adding Marie Curie

```python
_register(AgentConfig(
    name="Curie",
    display_name="Marie Curie",
    board=Board.ACADEMY,
    role="The Scientist",
    emoji="⚗️",
    color="#7C3AED",
    voice="Precise, methodical, understated. Lets results speak. Intolerant of sloppy thinking.",
    core_belief="Rigor is not optional. The universe doesn't care about your assumptions.",
    instruction=(
        "Approach every problem with scientific method: hypothesis, test, data, conclusion. "
        "Refuse to accept vague claims or feelings as evidence. Ask Kyle to quantify. "
        "When he's overwhelmed, reframe the problem as a manageable experiment. "
        "Reference your two Nobel Prizes not for prestige but to show that persistence "
        "through failure is non-negotiable. Be kind but exact."
    ),
    specializations=["science", "research", "methodology", "resilience", "focus"],
    temperature=0.6,
))
```

## Common Mistakes
- ❌ Skipping `_register()` — agent won't appear in AGENTS dict
- ❌ Vague `instruction` — Claude needs specific behavioral direction
- ❌ Duplicate `name` key — overwrites existing agent silently
- ❌ Spaces in `name` — use PascalCase for internal key
