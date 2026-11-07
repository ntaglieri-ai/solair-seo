import { NextRequest, NextResponse } from "next/server";
import { SEO_SESSION_COOKIE } from "../../../lib/crm-auth";
export const dynamic = "force-dynamic";
export async function POST() {
  return NextResponse.json({ error: "Usa l’accesso e i permessi del CRM." }, { status: 410 });
}
export async function DELETE(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Origine non valida." }, { status: 403 });
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SEO_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
