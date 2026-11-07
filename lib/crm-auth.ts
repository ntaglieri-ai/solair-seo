import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export const SEO_SESSION_COOKIE = "solair_seo_session";
export type SeoAccess = { access: "r" | "rw"; name: string };
export class SeoAuthError extends Error {
  constructor(public status: number) { super("Accesso CRM non disponibile"); }
}
export async function verifyCrmAccess(token: string): Promise<SeoAccess> {
  const base = process.env.CRM_URL;
  if (!base) throw new SeoAuthError(503);
  const response = await fetch(new URL("/api/auth/seo/permissions", base), {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new SeoAuthError([401, 403].includes(response.status) ? response.status : 503);
  const data = await response.json();
  if (!["r", "rw"].includes(data.access) || typeof data.name !== "string") throw new SeoAuthError(503);
  return data;
}
export const getSeoAccess = cache(async () => {
  const token = (await cookies()).get(SEO_SESSION_COOKIE)?.value;
  if (!token) throw new SeoAuthError(401);
  return verifyCrmAccess(token);
});
export async function requireSeoPage() {
  try { return await getSeoAccess(); }
  catch (error) {
    if (error instanceof SeoAuthError && error.status === 401) redirect("/auth/login");
    redirect("/auth/error");
  }
}
export async function canWriteSeo() {
  try { return (await getSeoAccess()).access === "rw"; } catch { return false; }
}
export async function requireSeoApi(request: Request, write = false) {
  try {
    const permission = await getSeoAccess();
    if (write && permission.access !== "rw") throw new SeoAuthError(403);
    if (write && request.headers.get("origin") !== new URL(request.url).origin) throw new SeoAuthError(403);
    return null;
  } catch (error) {
    const status = error instanceof SeoAuthError ? error.status : 503;
    return NextResponse.json({ error: status === 401 ? "Accedi tramite il CRM." : status === 403 ? "Il tuo profilo CRM non consente questa operazione." : "Verifica permessi CRM non disponibile." }, {
      status, headers: { "Cache-Control": "no-store" },
    });
  }
}
