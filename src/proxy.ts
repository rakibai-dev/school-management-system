import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Optimistic auth check only — real session validation happens server-side
// (proxy must not touch the DB; it can run on the edge runtime).
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"]

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.get(name))

  const { pathname } = request.nextUrl

  // Unauthenticated users can only reach /login (and NextAuth's own API routes)
  if (!hasSession && !pathname.startsWith("/login")) {
    const loginUrl = new URL("/login", request.url)
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Already signed in — skip the login page
  if (hasSession && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login"],
}
