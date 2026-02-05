import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware for domain-based routing
 *
 * Handles white-label domains by rewriting requests to dedicated routes:
 * - games.store.fun -> /store-fun (white-label landing page)
 * - games.store.fun/games/24 -> works normally with white-label layout
 */

// Map of white-label domains to their route prefixes
const WHITELABEL_DOMAINS: Record<string, string> = {
  "games.store.fun": "store-fun",
  // Add more partnerships here as needed
  // "games.partner.com": "partner-name",
};

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // Check if this is a white-label domain
  const partnerSlug = WHITELABEL_DOMAINS[hostname];

  if (partnerSlug) {
    // For the root path, rewrite to the white-label landing page
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/${partnerSlug}`;
      return NextResponse.rewrite(url);
    }

    // For other paths, add a header so layouts can detect white-label context
    const response = NextResponse.next();
    response.headers.set("x-whitelabel-partner", partnerSlug);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Match all paths except static files and API routes
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|images|sound|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
