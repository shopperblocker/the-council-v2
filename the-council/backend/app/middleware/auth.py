"""
API Key Auth Middleware: Protects /api/* routes with Bearer token auth.

Only activated when API_KEY is set in the environment.
Skip list: /api/health (always public).
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """Check Authorization: Bearer <key> on all /api/* routes except /api/health."""

    def __init__(self, app, api_key: str):
        super().__init__(app)
        self.api_key = api_key

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        # Only protect /api/* routes; skip health check
        if path.startswith("/api/") and path != "/api/health":
            auth_header = request.headers.get("Authorization", "")
            token = auth_header[len("Bearer "):] if auth_header.startswith("Bearer ") else ""
            if token != self.api_key:
                return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)
