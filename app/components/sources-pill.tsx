import { baselineAudit } from "../data/audit-baseline";
import { readHomePerformance } from "../data/home-performance";
import { readHomeGemini } from "../data/home-geo";
import { safeRead } from "../../lib/engine/safe";
import { StatusPill } from "./app-shell";

export async function SourcesPill() {
  const siteId = baselineAudit.domain;
  const [{ gsc, ga4 }, gemini] = await Promise.all([readHomePerformance(siteId), safeRead("pill Gemini", () => readHomeGemini(siteId))]);
  const ok = !!gsc?.lastDate && !!ga4?.lastDate && !!gemini?.settings?.enabled;
  return <StatusPill ok={ok}>{ok ? "Fonti collegate" : "Fonti da verificare"}</StatusPill>;
}
