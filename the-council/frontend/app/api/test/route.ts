import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    message: "Next.js API route is working!",
    timestamp: new Date().toISOString(),
    env: {
      hasBackendUrl: !!process.env.NEXT_PUBLIC_BACKEND_URL,
      backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || "using default"
    }
  });
}
