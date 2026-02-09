import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "https://the-council-backend-production-e480.up.railway.app";

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `${BACKEND_URL}/api/${path}${request.nextUrl.search}`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `${BACKEND_URL}/api/${path}${request.nextUrl.search}`;

  const body = await request.text();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body || undefined,
  });

  // Check if this is an SSE stream
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
