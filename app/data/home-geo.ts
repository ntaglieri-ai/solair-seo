import "server-only";
import { getGeoDashboard } from "../../lib/geo/read";
import { FREQUENCY_DAYS } from "../../lib/geo/store";
import { gapSources, summarizeScan } from "../../lib/geo/summary";
import type { GeoAnswer } from "../../lib/geo/answer";

/** Ultima scansione Gemini con almeno una risposta, già riassunta per la home. */
export async function readHomeGemini(siteId: string) {
  const { settings, usage, history } = await getGeoDashboard(siteId);
  const latest = history.find(({ scan, requests }) => ["done", "partial"].includes(scan.status) && requests.some(r => r.result));
  const answers = (latest?.requests ?? []).map(r => r.result).filter((r): r is GeoAnswer => !!r);
  const summary = latest ? summarizeScan(answers, latest.scan.plannedPrompts) : null;
  const sources = latest ? gapSources(answers) : null;
  const scheduled = !!settings?.enabled && !!settings.frequency && settings.frequency !== "manual";
  const base = history[0]?.scan.finishedAt ?? history[0]?.scan.startedAt ?? null;
  const next = scheduled && settings && settings.frequency !== "manual" && base
    ? new Date(new Date(base).getTime() + FREQUENCY_DAYS[settings.frequency] * 86_400_000) : null;
  return {
    settings, usage, summary, sources,
    scan: latest ? { startedAt: latest.scan.startedAt, status: latest.scan.status, model: latest.scan.model } : null,
    schedule: { scheduled, frequency: settings?.frequency ?? "manual", next },
  };
}
