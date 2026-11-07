import { NextRequest, NextResponse } from "next/server";
import { FLOW_COOKIE, oauthConfig, pkce, safeReturnPath } from "../../../lib/crm-oauth";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const config = oauthConfig(), flow = pkce();
    const url = new URL("/auth/v1/oauth/authorize", config.issuer);
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.callback,
      response_type: "code", scope: "email profile", state: flow.state,
      code_challenge: flow.challenge, code_challenge_method: "S256" }).toString();
    const response = NextResponse.redirect(url);
    response.cookies.set(FLOW_COOKIE, JSON.stringify({ state: flow.state, verifier: flow.verifier,
      next: safeReturnPath(request.nextUrl.searchParams.get("next")), until: Date.now() + 600000 }), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/auth", maxAge: 600,
    });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch { return NextResponse.redirect(new URL("/auth/error", request.url)); }
}
