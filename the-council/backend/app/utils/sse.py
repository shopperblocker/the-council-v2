"""Shared Server-Sent Events formatting utility."""

import json


def format_sse(event: str, data: dict) -> str:
    """Format a Server-Sent Event with safe newline escaping.

    Replaces literal newlines in the JSON payload so multi-line agent tokens
    don't break SSE parsers that split on blank lines.
    """
    json_str = json.dumps(data).replace("\n", "\\n")
    return f"event: {event}\ndata: {json_str}\n\n"
