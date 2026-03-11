"""Tests for Claw prompt builder."""

import sys
from pathlib import Path

# Add claw root to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from context.prompt_builder import build_claude_code_prompt, select_agent, TASK_TYPES


def test_prompt_contains_required_sections():
    prompt = build_claude_code_prompt(
        task_description="Add a dark mode toggle to the dashboard",
        project="the-council",
        relevant_files=["app/dashboard/page.tsx", "app/globals.css"],
        task_type="ui",
    )

    assert "## Task" in prompt, "Missing '## Task' section"
    assert "## Project Context" in prompt, "Missing '## Project Context' section"
    assert "## Relevant Files" in prompt, "Missing '## Relevant Files' section"
    assert "## Definition of Done" in prompt, "Missing '## Definition of Done' section"
    assert "## Constraints" in prompt, "Missing '## Constraints' section"


def test_prompt_includes_task_description():
    task = "Fix the streaming bug in the War Room"
    prompt = build_claude_code_prompt(task, project="the-council", task_type="fix")
    assert task in prompt


def test_prompt_includes_project_name():
    prompt = build_claude_code_prompt("Do something", project="the-council", task_type="general")
    assert "The Council" in prompt


def test_prompt_includes_relevant_files():
    files = ["app/war-room/page.tsx", "lib/api.ts"]
    prompt = build_claude_code_prompt("Fix bug", project="the-council", relevant_files=files, task_type="fix")
    for f in files:
        assert f in prompt, f"Missing file: {f}"


def test_prompt_no_files_section_when_empty():
    prompt = build_claude_code_prompt("Task", project="the-council", relevant_files=None, task_type="general")
    assert "## Relevant Files" not in prompt


def test_select_agent_ui():
    assert select_agent("ui") == "claude-code"


def test_select_agent_default():
    assert select_agent("general") == "claude-code"


def test_all_task_types_valid():
    for task_type in TASK_TYPES:
        prompt = build_claude_code_prompt("Test task", project="the-council", task_type=task_type)
        assert "## Definition of Done" in prompt, f"Missing DoD for task_type={task_type}"


if __name__ == "__main__":
    tests = [v for k, v in globals().items() if k.startswith("test_")]
    passed = 0
    failed = 0
    for test in tests:
        try:
            test()
            print(f"  ✓ {test.__name__}")
            passed += 1
        except Exception as e:
            print(f"  ✗ {test.__name__}: {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)
