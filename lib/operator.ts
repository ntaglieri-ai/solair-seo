import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
export const OPERATOR_COOKIE = "solair_operator";
const sign = (value: string, secret: string) => createHmac("sha256", secret).update(value).digest("hex");
const equal = (a: string, b: string) => { const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y); };
export function operatorKey(secret: string) { return sign("solair:interventions:access:v1", secret).slice(0,40); }
export function validOperatorKey(value: string, secret: string) { return equal(value, operatorKey(secret)); }
export function operatorToken(secret: string, now = Date.now()) {
  const payload = `${now + 8*3600000}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${sign(`solair:operator:session:${payload}`, secret)}`;
}
export function validOperatorToken(token: string | undefined, secret: string | undefined, now = Date.now()) {
  if (!token || !secret || token.length > 200) return false;
  const [until, nonce, mac, extra] = token.split(".");
  if (extra || !/^\d+$/.test(until) || !/^[a-f0-9]{32}$/.test(nonce ?? "") || !/^[a-f0-9]{64}$/.test(mac ?? "")) return false;
  const expires = Number(until);
  return expires > now && expires <= now+8*3600000 && equal(mac, sign(`solair:operator:session:${until}.${nonce}`, secret));
}
