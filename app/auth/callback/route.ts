import { NextRequest, NextResponse } from "next/server";
import { FLOW_COOKIE, oauthConfig, safeReturnPath } from "../../../lib/crm-oauth";
import { SEO_SESSION_COOKIE, verifyCrmAccess } from "../../../lib/crm-auth";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  let response: NextResponse;
  try {
    const config = oauthConfig();
    const flow = JSON.parse(request.cookies.get(FLOW_COOKIE)?.value ?? "null");
    const code = request.nextUrl.searchParams.get("code"), state = request.nextUrl.searchParams.get("state");
    if (!flow || !state || flow.state !== state || flow.until < Date.now() || typeof flow.verifier !== "string" || !code || request.nextUrl.searchParams.has("error")) throw new Error("Flusso non valido");
    const form = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: config.callback,
      client_id: config.clientId, code_verifier: flow.verifier });
    const secret = process.env.CRM_OAUTH_CLIENT_SECRET;
    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
    if (secret) headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${secret}`).toString("base64")}`;
    const exchange = await fetch(new URL("/auth/v1/oauth/token", config.issuer), {
      method: "POST", headers, body: form, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
    if (!exchange.ok) throw new Error("Scambio non valido");
    const tokens = await exchange.json();
    if (typeof tokens.access_token !== "string" || tokens.access_token.length > 3800 || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0) throw new Error("Sessione non valida");
    await verifyCrmAccess(tokens.access_token);
    response = NextResponse.redirect(new URL(safeReturnPath(flow.next), request.url));
    // No refresh token: expiration returns through the CRM, rechecking its active browser session.
    response.cookies.set(SEO_SESSION_COOKIE, tokens.access_token, { httpOnly: true,
      secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.min(tokens.expires_in, 3600) });
  } catch { response = NextResponse.redirect(new URL("/auth/error", request.url)); }
  response.cookies.set(FLOW_COOKIE, "", { path: "/auth", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
