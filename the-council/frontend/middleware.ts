import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login"];
const PUBLIC_PREFIXES = ["/_next", "/favicon", "/public", "/demo"];

// When AUTH_SECRET is set, use NextAuth middleware for session checks.
// When it's NOT set (local dev), skip auth entirely so the app is usable
// without configuring PostgreSQL + user seeding.
const authEnabled = !!process.env.AUTH_SECRET;

async function withAuth(req: NextRequest) {
  // Dynamic import so we don't crash when auth.ts deps are missing
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes, static assets, and all API proxy routes
  const isPublic =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublic) return NextResponse.next();

  // Skip auth in local dev when AUTH_SECRET is not configured
  if (!authEnabled) return NextResponse.next();

  return withAuth(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
