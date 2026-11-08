import "server-only";
import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { SEO_SESSION_COOKIE } from "./crm-auth";
export type CrmServices = { config: { nextcloudPath: string; emailEnabled: boolean }; status: { nextcloudConfigured: boolean; emailConfigured: boolean } };
export async function crmServicesRequest(method: "GET" | "POST", value?: unknown) {
  const token = (await cookies()).get(SEO_SESSION_COOKIE)?.value;
  const secret = process.env.SOLAIR_SEO_SETTINGS_SECRET, base = process.env.CRM_URL;
  if (!token || !secret || !base) throw new Error("Servizi CRM non disponibili.");
  const path = "/api/auth/seo/services", body = method === "POST" ? JSON.stringify(value) : "", timestamp = String(Date.now());
  const signature = createHmac("sha256", secret).update(`${timestamp}\n${method}\n${path}\n${body}`).digest("hex");
  const response = await fetch(new URL(path, base), { method, body: body || undefined, cache: "no-store", redirect: "error",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "x-crm-time": timestamp, "x-crm-signature": signature }, signal: AbortSignal.timeout(60000) });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Operazione non riuscita.");
  return data;
}
