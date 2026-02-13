"""
Tools: Functions the agents can call during conversations.

Currently uses mock data for web_search and stock prices.
Calculator is fully functional.
Wire real APIs by replacing the mock implementations below.
"""

import json
import ast
import operator


# ── Tool Definitions (Anthropic tool_use format) ──

TOOL_DEFINITIONS = [
    {
        "name": "web_search",
        "description": "Search the web for current information. Use for news, recent events, or facts you're uncertain about.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query",
                }
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_stock_price",
        "description": "Get the current stock price for a publicly traded company.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": "Stock ticker symbol (e.g. AAPL, MSFT, TSLA)",
                }
            },
            "required": ["ticker"],
        },
    },
    {
        "name": "calculator",
        "description": "Perform mathematical calculations. Supports +, -, *, /, **, % and parentheses.",
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Math expression to evaluate (e.g. '500 * 12 * 0.07')",
                }
            },
            "required": ["expression"],
        },
    },
]


# ── Safe Calculator ──

_SAFE_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
}


def _safe_eval(node):
    if isinstance(node, ast.Constant):
        return node.value
    elif isinstance(node, ast.BinOp):
        op = _SAFE_OPS.get(type(node.op))
        if op is None:
            raise ValueError(f"Unsupported operator: {type(node.op)}")
        return op(_safe_eval(node.left), _safe_eval(node.right))
    elif isinstance(node, ast.UnaryOp):
        op = _SAFE_OPS.get(type(node.op))
        if op is None:
            raise ValueError(f"Unsupported operator: {type(node.op)}")
        return op(_safe_eval(node.operand))
    else:
        raise ValueError(f"Unsupported expression: {type(node)}")


def calculate(expression: str) -> str:
    try:
        tree = ast.parse(expression, mode="eval")
        result = _safe_eval(tree.body)
        # Format cleanly
        if isinstance(result, float) and result.is_integer():
            return str(int(result))
        return f"{result:.4f}".rstrip("0").rstrip(".")
    except Exception as e:
        return f"Error: {e}"


# ── Tool Execution ──

async def execute_tool(name: str, tool_input: dict) -> str:
    """Execute a tool and return its result as a string."""

    if name == "calculator":
        return calculate(tool_input.get("expression", ""))

    elif name == "get_stock_price":
        ticker = tool_input.get("ticker", "").upper()
        try:
            import yfinance as yf
            stock = yf.Ticker(ticker)
            info = stock.fast_info
            price = round(float(info.last_price), 2)
            prev_close = round(float(info.previous_close), 2)
            change = round(price - prev_close, 2)
            change_pct = round((change / prev_close) * 100, 2) if prev_close else 0
            return json.dumps({
                "ticker": ticker,
                "price": price,
                "change": change,
                "change_percent": change_pct,
                "currency": getattr(info, "currency", "USD"),
            })
        except Exception as e:
            return json.dumps({"ticker": ticker, "error": str(e)})

    elif name == "web_search":
        query = tool_input.get("query", "")
        # TODO: Replace with real API (SerpAPI or Tavily)
        return json.dumps({
            "query": query,
            "results": [
                {
                    "title": f"Search result for: {query}",
                    "snippet": "This is mock search data. Connect a real search API to get live results.",
                    "url": "https://example.com",
                }
            ],
            "note": "mock data — wire SerpAPI or Tavily to get real results",
        })

    return f"Unknown tool: {name}"
