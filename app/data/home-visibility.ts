import "server-only";
import { getOnPageHistory } from "../../lib/engine/read";
import { getAuditTrend } from "../../lib/service-read";
import { getGeoDashboard } from "../../lib/geo/read";
import { summarizeScan, suggestOpportunities } from "../../lib/geo/summary";
import { safeRead } from "../../lib/engine/safe";
import { formatDate } from "../../lib/format";
import type { GeoAnswer } from "../../lib/geo/answer";
import type { Opportunity as GeoOpportunity } from "../../lib/geo/summary";

export type PillarKey = "seo" | "geo" | "tech";

export type Pillar = {
  key: PillarKey;
  label: string;
  /** 0–100, null se non ancora misurato. */
  score: number | null;
  /** Punti rispetto alla rilevazione precedente comparabile, null se non calcolabile. */
  delta: number | null;
  detail: string;
  date: string | null;
  href: string;
};

export type Visibility = {
  /** Media dei pilastri disponibili, null se nessuno è misurato. */
  score: number | null;
  delta: number | null;
  /** True se non tutti e tre i pilastri hanno un punteggio. */
  partial: boolean;
  pillars: Pillar[];
  /** Opportunità più rilevante trovata nell'ultima scansione Gemini completata, null se non calcolabile. */
  geoAction: GeoOpportunity | null;
};

function geoScoreOf(entry: { scan: { status: string }; requests: { result: GeoAnswer | null }[] } | undefined) {
  if (!entry) return null;
  const answers = entry.requests.map((r) => r.result).filter((r): r is GeoAnswer => !!r);
  const summary = summarizeScan(answers, 0);
  if (!summary.nonBrandComplete) return null;
  return { score: Math.round((summary.nonBrandMentioned / summary.nonBrandComplete) * 100), summary };
}

/** Indice di visibilità per la home: media di SEO (audit), Visibilità AI (GEO) e salute tecnica (on-page). */
export async function readHomeVisibility(siteId: string): Promise<Visibility> {
  const [onpage, auditTrend, geoDash] = await Promise.all([
    safeRead("home tecnico", () => getOnPageHistory(siteId, 12)),
    safeRead("home seo audit", () => getAuditTrend(siteId)),
    safeRead("home geo", () => getGeoDashboard(siteId)),
  ]);

  const techRuns = (onpage ?? []).filter((r) => r.kind === "onpage");
  const tech = techRuns[0] ?? null;
  const techPrev = techRuns[1] ?? null;

  const completedScans = (geoDash?.history ?? []).filter(
    (h) => ["done", "partial"].includes(h.scan.status) && h.requests.some((r) => r.result)
  );
  const geo = geoScoreOf(completedScans[0]);
  const geoPrev = geoScoreOf(completedScans[1]);

  const latestAnswers = completedScans[0]
    ? completedScans[0].requests.map((r) => r.result).filter((r): r is GeoAnswer => !!r)
    : [];
  const geoOpportunities = latestAnswers.length ? suggestOpportunities(latestAnswers) : [];
  // Una domanda specifica a cui Solair non risponde è più leggibile, in home, di un dominio citato: se c'è la preferiamo.
  const geoAction = geoOpportunities.find((o) => o.kind === "prompt_gap") ?? geoOpportunities[0] ?? null;

  const seoScore = auditTrend?.latest?.score ?? null;
  const seoDelta = auditTrend?.difference ?? null;

  const pillars: Pillar[] = [
    {
      key: "seo",
      label: "SEO su Google",
      score: seoScore,
      delta: seoDelta,
      detail: auditTrend?.latest ? `Ultimo audit: ${formatDate(auditTrend.latest.date)}` : "In attesa del primo audit SEO.",
      date: auditTrend?.latest?.date ?? null,
      href: "/sezioni/historical-comparison#history-score",
    },
    {
      key: "geo",
      label: "Visibilità AI",
      score: geo?.score ?? null,
      delta: geo && geoPrev ? geo.score - geoPrev.score : null,
      detail: geo
        ? `${geo.summary.nonBrandMentioned} risposte su ${geo.summary.nonBrandComplete} nominano Solair senza che venga chiesto.`
        : "Nessuna scansione Gemini completata.",
      date: null,
      href: "/visibilita-ai",
    },
    {
      key: "tech",
      label: "Salute tecnica",
      score: tech?.score ?? null,
      delta: tech && techPrev ? tech.score - techPrev.score : null,
      detail: tech
        ? tech.deductions.length === 0
          ? "Nessuna criticità rilevata sull'ultima scansione on-page."
          : `${tech.deductions.length} ${tech.deductions.length === 1 ? "criticità rilevata" : "criticità rilevate"} sull'ultima scansione on-page.`
        : "Nessuna scansione on-page ancora archiviata.",
      date: tech ? tech.scannedAt.toISOString().slice(0, 10) : null,
      href: "/sezioni/historical-comparison#history-tech",
    },
  ];

  const available = pillars.filter((p): p is Pillar & { score: number } => p.score !== null);
  const score = available.length ? Math.round(available.reduce((s, p) => s + p.score, 0) / available.length) : null;
  const availableDeltas = pillars.filter((p): p is Pillar & { delta: number } => p.delta !== null);
  const delta = availableDeltas.length
    ? Math.round(availableDeltas.reduce((s, p) => s + p.delta, 0) / availableDeltas.length)
    : null;

  return { score, delta, partial: available.length > 0 && available.length < 3, pillars, geoAction };
}
