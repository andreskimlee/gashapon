import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Paths that don't require authentication
const PUBLIC_PATHS = [
  "/enter",
  "/admin",
  "/api/auth/verify-password",
  "/_next",
  "/favicon.ico",
  "/grabbit-coin-image.png",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public paths and static files
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Skip auth check for static assets
  if (
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|glb|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // Check if site password protection is enabled
  const sitePassword = process.env.SITE_PASSWORD;

  // If no password is configured, allow all access
  if (!sitePassword) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get("site-auth");

  if (authCookie?.value === "authenticated") {
    return NextResponse.next();
  }

  // Redirect to password entry page
  const enterUrl = new URL("/enter", request.url);
  return NextResponse.redirect(enterUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
