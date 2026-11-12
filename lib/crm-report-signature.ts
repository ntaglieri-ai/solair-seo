import { createHmac, timingSafeEqual } from "node:crypto";

/** Only the CRM backend can read archived report metadata and PDFs. */
export function validCrmReportSignature(request: Request, secret = process.env.SOLAIR_SEO_SETTINGS_SECRET, now = Date.now()) {
  const timestamp = request.headers.get("x-crm-time") ?? "";
  const signature = request.headers.get("x-crm-signature") ?? "";
  if (!secret || !/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 30000 || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const url = new URL(request.url);
  const expected = createHmac("sha256", secret).update(`${timestamp}\n${request.method}\n${url.pathname}${url.search}\n`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
