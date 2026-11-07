import { NextRequest, NextResponse } from "next/server";
const SEO_SESSION_COOKIE = "solair_seo_session";
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/auth/") || request.nextUrl.pathname.startsWith("/_next/") || request.nextUrl.pathname === "/favicon.ico" || request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  if (request.cookies.get(SEO_SESSION_COOKIE)?.value) return NextResponse.next();
  const target = new URL("/auth/login", request.url);
  target.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(target);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
