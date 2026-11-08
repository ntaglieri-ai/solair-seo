import { createHmac, timingSafeEqual } from "node:crypto";

export function validSettingsSignature(headers: Headers, method: string, body: string, secret: string | undefined, now = Date.now(), path = "/api/crm-settings") {
  if (!secret) return false;
  const timestamp = headers.get("x-crm-time") ?? "";
  const signature = headers.get("x-crm-signature") ?? "";
  if (!/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 30000 || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}\n${method}\n${path}\n${body}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
