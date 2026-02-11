"""
Tool Definitions and Implementations for Agent Use.

Provides agents with tools like web search, stock prices, and calculations.
Based on Anthropic SDK tool use pattern.
"""

from typing import Any, Callable
from datetime import datetime
import json


# Tool registry
TOOL_REGISTRY: dict[str, Callable] = {}


def register_tool(name: str):
    """Decorator to register tools."""
    def decorator(func: Callable):
        TOOL_REGISTRY[name] = func
        return func
    return decorator


# ══════════════════════════════════════════
# TOOL DEFINITIONS (for Claude API)
# ══════════════════════════════════════════

TOOL_DEFINITIONS = [
    {
        "name": "web_search",
        "description": "Search the web for current information, news, and data. Use this when Kyle asks about recent events or information you don't have.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query (e.g., 'Kenya fintech startups 2026')"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_stock_price",
        "description": "Get current stock price and market data for a ticker symbol. Useful for financial analysis and investment discussions.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": "Stock ticker symbol (e.g., AAPL, TSLA, GOOGL)"
                }
            },
            "required": ["ticker"]
        }
    },
    {
        "name": "calculator",
        "description": "Perform mathematical calculations. Use for financial projections, ROI calculations, compound interest, etc.",
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression to evaluate (e.g., '(100 * 1.08) + 50', '500 * 12 * 0.07')"
                }
            },
            "required": ["expression"]
        }
    }
]


# ══════════════════════════════════════════
# TOOL IMPLEMENTATIONS
# ══════════════════════════════════════════

@register_tool("web_search")
async def web_search(query: str) -> dict:
    """
    Search the web for current information.

    For MVP: Returns mock data.
    TODO: Integrate SerpAPI, Tavily, or DuckDuckGo search.
    """
    # Mock implementation
    mock_results = [
        {
            "title": f"Search result for: {query}",
            "snippet": "This is a mock search result. To enable real web search, add SERPAPI_KEY to .env and integrate the SerpAPI client.",
            "url": "https://example.com/search"
        },
        {
            "title": "Related article",
            "snippet": "Mock result #2. Real search integration coming soon.",
            "url": "https://example.com/article"
        }
    ]

    return {
        "query": query,
        "results": mock_results,
        "timestamp": datetime.now().isoformat(),
        "note": "Mock data - integrate real search API for production"
    }


@register_tool("get_stock_price")
async def get_stock_price(ticker: str) -> dict:
    """
    Fetch current stock price for a ticker symbol.

    For MVP: Returns mock data.
    TODO: Integrate yfinance or Alpha Vantage API.
    """
    # Mock implementation
    ticker_upper = ticker.upper()

    # Mock prices for common stocks
    mock_prices = {
        "AAPL": 175.50,
        "TSLA": 245.30,
        "GOOGL": 140.25,
        "MSFT": 380.75,
        "AMZN": 155.60,
        "NVDA": 485.20,
    }

    price = mock_prices.get(ticker_upper, 150.00)  # Default price if not in list
    change = round(price * 0.015, 2)  # Mock 1.5% change
    change_percent = 1.5

    return {
        "ticker": ticker_upper,
        "price": price,
        "change": change,
        "change_percent": change_percent,
        "currency": "USD",
        "timestamp": datetime.now().isoformat(),
        "note": "Mock data - integrate real stock API for production (yfinance or Alpha Vantage)"
    }


@register_tool("calculator")
async def calculator(expression: str) -> dict:
    """
    Safely evaluate mathematical expressions.

    Uses Python's eval with restricted namespace for safety.
    """
    try:
        # Restricted namespace - only allow math operations
        safe_dict = {
            "__builtins__": {},
            "abs": abs,
            "round": round,
            "min": min,
            "max": max,
            "sum": sum,
            "pow": pow,
        }

        # Evaluate the expression
        result = eval(expression, safe_dict)

        return {
            "expression": expression,
            "result": result,
            "formatted": f"{expression} = {result}",
            "success": True
        }
    except Exception as e:
        return {
            "expression": expression,
            "error": str(e),
            "success": False,
            "message": f"Failed to evaluate expression: {str(e)}"
        }


# ══════════════════════════════════════════
# TOOL EXECUTION
# ══════════════════════════════════════════

async def execute_tool(tool_name: str, tool_input: dict) -> str:
    """
    Execute a tool by name with given input.

    Returns the result as a JSON string.
    """
    tool_func = TOOL_REGISTRY.get(tool_name)

    if not tool_func:
        return json.dumps({
            "error": f"Tool '{tool_name}' not found",
            "available_tools": list(TOOL_REGISTRY.keys())
        })

    try:
        result = await tool_func(**tool_input)
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "tool": tool_name,
            "input": tool_input
        })
