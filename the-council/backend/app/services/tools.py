"""
Tools: Functions the agents can call during conversations.

Calculator is fully functional.
Stock prices use yfinance with a direct HTTP fallback (Yahoo Finance can block cloud IPs).
Web search uses Tavily when TAVILY_API_KEY is set; falls back to curated results otherwise.
"""

import json
import ast
import logging
import operator

logger = logging.getLogger(__name__)


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
        if isinstance(result, float) and result.is_integer():
            return str(int(result))
        return f"{result:.4f}".rstrip("0").rstrip(".")
    except Exception as e:
        return f"Error: {e}"


# ── Stock Price (yfinance + direct HTTP fallback) ──

async def _fetch_price_yfinance(ticker: str) -> dict:
    """Primary: yfinance fast_info."""
    import yfinance as yf
    stock = yf.Ticker(ticker)
    info = stock.fast_info

    price = info.last_price
    prev_close = info.previous_close

    # fast_info can return None if market is closed or data stale
    if price is None:
        hist = stock.history(period="2d")
        if hist.empty:
            raise ValueError("No price data available")
        price = float(hist["Close"].iloc[-1])
        prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else price

    price = round(float(price), 2)
    prev_close = round(float(prev_close), 2)
    change = round(price - prev_close, 2)
    change_pct = round((change / prev_close) * 100, 2) if prev_close else 0

    return {
        "ticker": ticker,
        "price": price,
        "change": change,
        "change_pct": change_pct,
        "currency": getattr(info, "currency", "USD"),
    }


async def _fetch_price_http(ticker: str) -> dict:
    """Fallback: direct Yahoo Finance v8 API call with browser headers."""
    import urllib.request
    import urllib.error

    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        f"?interval=1d&range=2d"
    )
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

        result = data["chart"]["result"][0]
        meta = result["meta"]
        price = round(float(meta["regularMarketPrice"]), 2)
        prev_close = round(float(meta.get("previousClose", price)), 2)
        change = round(price - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2) if prev_close else 0

        return {
            "ticker": ticker,
            "price": price,
            "change": change,
            "change_pct": change_pct,
            "currency": meta.get("currency", "USD"),
        }
    except (urllib.error.URLError, json.JSONDecodeError, KeyError, IndexError, ValueError) as e:
        raise RuntimeError(f"HTTP price fetch failed for {ticker}: {e}") from e


# ── Web Search (Tavily live search with curated fallback) ──

def _get_tavily_key() -> str | None:
    """Return the Tavily API key from settings, or None if not configured."""
    try:
        from app.config import get_settings
        return get_settings().tavily_api_key
    except (ImportError, AttributeError):
        return None


async def _web_search_tavily(query: str, api_key: str) -> str:
    """Live web search via Tavily API."""
    from tavily import TavilyClient
    client = TavilyClient(api_key=api_key)
    response = client.search(query, max_results=5, search_depth="basic")
    results = [
        {
            "title": r.get("title", ""),
            "url": r.get("url", ""),
            "snippet": r.get("content", ""),
        }
        for r in response.get("results", [])
    ]
    return json.dumps({"query": query, "results": results})


# Finance-related keywords — used for curated fallback when Tavily is not configured
_FINANCE_KEYWORDS = {
    "stock", "stocks", "market", "invest", "investing", "investment",
    "nasdaq", "nyse", "s&p", "dow", "ticker", "share", "shares",
    "equity", "equities", "portfolio", "bull", "bear", "rally",
    "trading", "trade", "etf", "fund", "price", "crypto",
}

_MAJOR_TICKERS = {
    "tech": ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA"],
    "finance": ["JPM", "BAC", "GS", "BRK-B", "V", "MA"],
    "healthcare": ["JNJ", "LLY", "UNH", "PFE", "ABBV"],
    "energy": ["XOM", "CVX", "COP"],
    "indices": ["SPY", "QQQ", "DIA", "IWM"],
}


def _web_search_finance_fallback(query: str) -> str:
    all_tickers = [t for group in _MAJOR_TICKERS.values() for t in group]
    return json.dumps({
        "query": query,
        "results": [
            {
                "title": "US Market Overview — Major Stocks",
                "snippet": (
                    "Technology leaders: AAPL (Apple), MSFT (Microsoft), NVDA (Nvidia), "
                    "GOOGL (Alphabet), META (Meta), AMZN (Amazon), TSLA (Tesla). "
                    "Financial sector: JPM, GS, BAC. Healthcare: JNJ, LLY, UNH. "
                    "Energy: XOM, CVX. Use get_stock_price for current prices."
                ),
                "tickers": _MAJOR_TICKERS["tech"] + _MAJOR_TICKERS["finance"],
            },
            {
                "title": "Market Indices",
                "snippet": (
                    "Track broad market via ETFs: SPY (S&P 500), QQQ (NASDAQ-100), "
                    "DIA (Dow Jones), IWM (Russell 2000). Use get_stock_price with "
                    "these symbols for current index levels."
                ),
                "tickers": _MAJOR_TICKERS["indices"],
            },
        ],
        "suggested_tickers": all_tickers[:10],
    })


def _web_search_generic_fallback(query: str) -> str:
    return json.dumps({
        "query": query,
        "results": [
            {
                "title": f"Search results for: {query}",
                "snippet": (
                    "Live web search requires a TAVILY_API_KEY in your .env. "
                    "For financial data, use get_stock_price with a ticker symbol. "
                    "For calculations, use the calculator tool."
                ),
            }
        ],
    })


# ── Tool Execution ──

async def execute_tool(name: str, tool_input: dict) -> str:
    """Execute a tool and return its result as a string."""

    if name == "calculator":
        return calculate(tool_input.get("expression", ""))

    elif name == "get_stock_price":
        ticker = tool_input.get("ticker", "").upper().strip()
        if not ticker:
            return json.dumps({"error": "No ticker provided"})

        # Try yfinance first, fall back to direct HTTP
        last_error = None
        for fetch_fn in [_fetch_price_yfinance, _fetch_price_http]:
            try:
                result = await fetch_fn(ticker)
                return json.dumps(result)
            except Exception as e:
                last_error = e
                logger.debug("Price fetch via %s failed: %s", fetch_fn.__name__, e)
                continue

        return json.dumps({
            "ticker": ticker,
            "unavailable": True,
            "reason": "Price data temporarily unavailable. Markets may be closed or the ticker may be invalid.",
        })

    elif name == "web_search":
        query = tool_input.get("query", "").strip()
        tavily_key = _get_tavily_key()
        if tavily_key:
            try:
                return await _web_search_tavily(query, tavily_key)
            except Exception as e:
                logger.warning("Tavily web search failed (falling back to curated): %s", e)
        q_lower = query.lower()
        if any(kw in q_lower for kw in _FINANCE_KEYWORDS):
            return _web_search_finance_fallback(query)
        return _web_search_generic_fallback(query)

    return json.dumps({"error": f"Unknown tool: {name}"})
