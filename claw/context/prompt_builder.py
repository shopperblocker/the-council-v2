"""
Prompt Builder: Constructs structured Claude Code prompts for task spawning.

No Claude API calls — pure string assembly.
"""

from context.personal_context import load_memory, load_project_context
from context.project_contexts import find_project

TASK_TYPES = ("ui", "backend", "infra", "general", "fix", "test", "docs")


def select_agent(task_type: str) -> str:
    """Route to the right agent based on task type."""
    if task_type in ("ui", "frontend"):
        return "claude-code"
    return "claude-code"  # default — codex can be added later


def build_claude_code_prompt(
    task_description: str,
    project: str,
    relevant_files: list[str] | None = None,
    task_type: str = "general",
) -> str:
    """
    Build a structured prompt for Claude Code.

    Returns a plain string suitable for passing to:
        claude --model claude-opus-4-6 --dangerously-skip-permissions -p "{prompt}"
    """
    project_info = find_project(project)
    project_name = project_info["name"] if project_info else project
    project_stack = project_info["stack"] if project_info else "Unknown"
    project_context = load_project_context(project)
    memory = load_memory()
    files_section = ""
    if relevant_files:
        files_section = "\n## Relevant Files\n" + "\n".join(f"- {f}" for f in relevant_files)

    dod_map = {
        "ui": "- Component renders correctly on desktop and mobile\n- No TypeScript errors (`npx tsc --noEmit`)\n- Uses design tokens from tailwind.config.ts (no hardcoded hex colors)\n- Dark navy theme consistent with existing pages",
        "backend": "- All new endpoints return correct HTTP status codes\n- No breaking changes to existing endpoints\n- SQLAlchemy queries use async correctly\n- No unhandled exceptions in logs",
        "fix": "- The specific bug described is no longer reproducible\n- No regressions in related functionality\n- TypeScript compiles cleanly",
        "test": "- Tests pass (`pytest` or `npm test`)\n- Edge cases covered\n- No new test failures",
        "general": "- Task completed as described\n- No breaking changes\n- Code follows existing patterns in the codebase",
    }
    definition_of_done = dod_map.get(task_type, dod_map["general"])

    constraints = """- Read files before editing (the Edit tool fails if you haven't read first)
- Follow existing code patterns — don't introduce new abstractions unless necessary
- Keep changes minimal and focused on the task
- Do not commit — just make the code changes
- Use the design system tokens (council-navy, council-gold, etc.) not hardcoded hex values
- No emoji in code unless already present"""

    prompt = f"""## Task
{task_description}

## Project Context
Project: {project_name}
Stack: {project_stack}

### Project Notes
{project_context}

### Recent Claw Memory
{memory[:800]}
{files_section}
## Definition of Done
{definition_of_done}

## Constraints
{constraints}"""

    return prompt.strip()
