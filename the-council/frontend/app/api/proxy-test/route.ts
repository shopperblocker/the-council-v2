import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://the-council-backend-production-e480.up.railway.app";

export async function GET(request: NextRequest) {
  const testUrl = `${BACKEND_URL}/api/war-room/agents`;

  try {
    console.log("Attempting to fetch from:", testUrl);

    const res = await fetch(testUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Response status:", res.status);
    console.log("Response headers:", Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      return NextResponse.json({
        error: "Backend returned error",
        status: res.status,
        statusText: res.statusText,
        backendUrl: testUrl,
      }, { status: res.status });
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      message: "Proxy is working!",
      backendUrl: testUrl,
      agentCount: data.length || 0,
      firstAgent: data[0]?.display_name || "none",
    });
  } catch (error: any) {
    console.error("Proxy test error:", error);
    return NextResponse.json({
      error: "Failed to connect to backend",
      message: error.message,
      backendUrl: testUrl,
    }, { status: 502 });
  }
}
