import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "https://the-council-backend-production-e480.up.railway.app";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const apiPath = path.join("/");
  const url = `${BACKEND_URL}/api/${apiPath}${request.nextUrl.search}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const apiPath = path.join("/");
  const url = `${BACKEND_URL}/api/${apiPath}${request.nextUrl.search}`;

  const body = await request.text();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body || undefined,
    });

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
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}
