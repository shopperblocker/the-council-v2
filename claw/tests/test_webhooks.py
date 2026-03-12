"""Tests for the Claw webhook automation system."""

import hashlib
import hmac
import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

# Add claw root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from webhooks.models import Event, WebhookRule
from webhooks.dispatcher import _evaluate_condition


class TestEventModel(unittest.TestCase):
    """Test the Event dataclass."""

    def test_event_creation(self):
        event = Event(source="github", event_type="push", payload={"ref": "refs/heads/main"})
        self.assertEqual(event.source, "github")
        self.assertEqual(event.event_type, "push")
        self.assertIn("ref", event.payload)
        self.assertNotEqual(event.timestamp, "")

    def test_event_with_meta(self):
        event = Event(
            source="github",
            event_type="pull_request",
            payload={},
            meta={"action": "closed", "repo": "org/repo"},
        )
        self.assertEqual(event.meta["action"], "closed")


class TestWebhookRule(unittest.TestCase):
    """Test the WebhookRule dataclass."""

    def test_rule_to_dict(self):
        rule = WebhookRule(
            id=1, name="Test", source="github",
            event_type="push", action="notify",
        )
        d = rule.to_dict()
        self.assertEqual(d["name"], "Test")
        self.assertTrue(d["enabled"])

    def test_rule_from_row(self):
        row = {
            "id": 1, "name": "PR Merged", "source": "github",
            "event_type": "pull_request", "condition": "",
            "action": "summarize_and_notify",
            "action_config": '{"template": "pr_merged"}',
            "enabled": 1,
        }
        rule = WebhookRule.from_row(row)
        self.assertEqual(rule.name, "PR Merged")
        self.assertEqual(rule.action_config["template"], "pr_merged")
        self.assertTrue(rule.enabled)


class TestConditionEvaluation(unittest.TestCase):
    """Test the rule condition evaluator."""

    def test_empty_condition_matches(self):
        rule = WebhookRule(condition="")
        event = Event(source="github", event_type="push", payload={})
        self.assertTrue(_evaluate_condition(rule, event))

    def test_meta_condition(self):
        rule = WebhookRule(condition='meta.get("action") == "closed"')
        event = Event(
            source="github", event_type="pull_request",
            payload={}, meta={"action": "closed"},
        )
        self.assertTrue(_evaluate_condition(rule, event))

    def test_meta_condition_no_match(self):
        rule = WebhookRule(condition='meta.get("action") == "closed"')
        event = Event(
            source="github", event_type="pull_request",
            payload={}, meta={"action": "opened"},
        )
        self.assertFalse(_evaluate_condition(rule, event))

    def test_payload_condition(self):
        rule = WebhookRule(condition='payload.get("ref") == "refs/heads/main"')
        event = Event(
            source="github", event_type="push",
            payload={"ref": "refs/heads/main"},
        )
        self.assertTrue(_evaluate_condition(rule, event))

    def test_compound_condition(self):
        rule = WebhookRule(
            condition='meta.get("action") == "closed" and payload.get("pull_request", {}).get("merged")',
        )
        event = Event(
            source="github", event_type="pull_request",
            payload={"pull_request": {"merged": True}},
            meta={"action": "closed"},
        )
        self.assertTrue(_evaluate_condition(rule, event))

    def test_invalid_condition_returns_false(self):
        rule = WebhookRule(condition="undefined_var.missing()")
        event = Event(source="github", event_type="push", payload={})
        self.assertFalse(_evaluate_condition(rule, event))

    def test_builtins_restricted(self):
        """Ensure dangerous builtins are not available in conditions."""
        rule = WebhookRule(condition='__import__("os").system("echo pwned")')
        event = Event(source="github", event_type="push", payload={})
        self.assertFalse(_evaluate_condition(rule, event))


class TestDatabase(unittest.TestCase):
    """Test the SQLite database layer with a temporary DB."""

    def setUp(self):
        import tempfile
        self.tmpdir = tempfile.mkdtemp()
        self.db_path = Path(self.tmpdir) / "test_webhooks.db"
        # Patch DB_PATH
        import webhooks.database as db_mod
        self._orig_path = db_mod.DB_PATH
        db_mod.DB_PATH = self.db_path

    def tearDown(self):
        import webhooks.database as db_mod
        db_mod.DB_PATH = self._orig_path
        if self.db_path.exists():
            self.db_path.unlink()

    def test_init_db_seeds_defaults(self):
        from webhooks.database import init_db, get_rules
        init_db()
        rules = get_rules()
        self.assertGreater(len(rules), 0)
        names = [r.name for r in rules]
        self.assertIn("PR Merged", names)
        self.assertIn("Push to Main", names)

    def test_add_and_get_rule(self):
        from webhooks.database import init_db, add_rule, get_rules
        init_db()
        rule = WebhookRule(
            name="Custom", source="generic", event_type="deploy",
            action="notify", action_config={"template": "custom"},
        )
        rule_id = add_rule(rule)
        self.assertIsNotNone(rule_id)

        rules = get_rules(source="generic")
        self.assertEqual(len(rules), 1)
        self.assertEqual(rules[0].name, "Custom")

    def test_toggle_rule(self):
        from webhooks.database import init_db, toggle_rule, get_rules
        init_db()
        rules = get_rules()
        rule_id = rules[0].id
        toggle_rule(rule_id, False)
        # Disabled rule should not appear in get_rules (which filters enabled=1)
        remaining = get_rules()
        ids = [r.id for r in remaining]
        self.assertNotIn(rule_id, ids)

    def test_delete_rule(self):
        from webhooks.database import init_db, delete_rule, get_rules
        init_db()
        rules = get_rules()
        count_before = len(rules)
        delete_rule(rules[0].id)
        self.assertEqual(len(get_rules()), count_before - 1)

    def test_log_event(self):
        from webhooks.database import init_db, log_event, _get_conn
        init_db()
        event_id = log_event(
            source="github", event_type="push",
            payload={"ref": "refs/heads/main"}, meta={"repo": "org/repo"},
            received_at="2025-01-01T00:00:00Z",
        )
        self.assertIsNotNone(event_id)
        conn = _get_conn()
        row = conn.execute("SELECT * FROM webhook_events WHERE id = ?", (event_id,)).fetchone()
        conn.close()
        self.assertEqual(dict(row)["source"], "github")


class TestActionFormatters(unittest.TestCase):
    """Test the action handler formatters."""

    def test_pr_merged_format(self):
        from webhooks.actions import _format_pr_merged
        event = Event(
            source="github", event_type="pull_request",
            payload={
                "pull_request": {
                    "title": "Add dark mode",
                    "number": 42,
                    "user": {"login": "dev"},
                    "additions": 100, "deletions": 20,
                    "changed_files": 5,
                    "html_url": "https://github.com/org/repo/pull/42",
                    "body": "Implements dark mode toggle",
                    "merged": True,
                },
            },
            meta={"action": "closed", "repo": "org/repo"},
        )
        msg = _format_pr_merged(event)
        self.assertIn("PR Merged", msg)
        self.assertIn("#42", msg)
        self.assertIn("Add dark mode", msg)
        self.assertIn("+100", msg)

    def test_push_main_format(self):
        from webhooks.actions import _format_push_main
        event = Event(
            source="github", event_type="push",
            payload={
                "ref": "refs/heads/main",
                "pusher": {"name": "dev"},
                "commits": [
                    {"id": "abc1234567890", "message": "Fix bug"},
                    {"id": "def4567890123", "message": "Update tests"},
                ],
                "compare": "https://github.com/org/repo/compare/abc...def",
            },
            meta={"repo": "org/repo"},
        )
        msg = _format_push_main(event)
        self.assertIn("Push to main", msg)
        self.assertIn("abc1234", msg)
        self.assertIn("Fix bug", msg)


class TestGitHubSignatureValidation(unittest.TestCase):
    """Test GitHub webhook signature validation."""

    def test_valid_signature(self):
        secret = "test-secret"
        body = b'{"action": "opened"}'
        sig = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

        expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        self.assertTrue(hmac.compare_digest(sig, expected))

    def test_invalid_signature(self):
        secret = "test-secret"
        body = b'{"action": "opened"}'
        wrong_sig = "sha256=0000000000000000000000000000000000000000000000000000000000000000"

        expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        self.assertFalse(hmac.compare_digest(wrong_sig, expected))


if __name__ == "__main__":
    unittest.main()
