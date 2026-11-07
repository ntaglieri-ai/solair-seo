import { createHash, randomBytes } from "node:crypto";
export const FLOW_COOKIE = "solair_seo_oauth";
export function oauthConfig() {
  const issuer = process.env.CRM_SUPABASE_URL;
  const clientId = process.env.CRM_OAUTH_CLIENT_ID;
  const app = process.env.SOLAIR_SEO_URL;
  if (!issuer || !clientId || !app) throw new Error("Accesso CRM non configurato");
  const callback = new URL("/auth/callback", app).toString();
  return { issuer, clientId, callback };
}
export function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  return { state: randomBytes(32).toString("base64url"), verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url") };
}
export function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\x00-\x20]/.test(value) || value.startsWith("/auth")) return "/";
  return value;
}
