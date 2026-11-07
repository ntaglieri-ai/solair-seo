import { NextRequest, NextResponse } from "next/server";
import { SEO_SESSION_COOKIE } from "../../../lib/crm-auth";
import { FLOW_COOKIE } from "../../../lib/crm-oauth";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origine non valida." }, { status: 403, headers });
  }
  const response = NextResponse.redirect(new URL("/auth/signed-out", request.url), { status: 303, headers });
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, maxAge: 0 };
  response.cookies.set(SEO_SESSION_COOKIE, "", { ...options, path: "/" });
  response.cookies.set("solair_operator", "", { ...options, path: "/" });
  response.cookies.set(FLOW_COOKIE, "", { ...options, path: "/auth" });
  return response;
}
