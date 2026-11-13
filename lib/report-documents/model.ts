import { createHash } from "node:crypto";
import type { StoredReport } from "../report-read";
import type { GeoAnswer } from "../geo/answer";
import { summarizeScan } from "../geo/summary";
import type { GscTotals } from "../engine/read";
import type { ReportMetrics } from "./metrics";
import type { ReportKind, Window } from "./windows";
export const PDF_TEMPLATE_VERSION = "solair-report-pdf-v4";
export const UUID = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;
export type DocumentAnswer = Omit<GeoAnswer, "estimatedUsd" | "searches" | "searchQueries" | "inputTokens" | "outputTokens">;
export type DocumentGeo = { id: string; status: string; model: string | null; protocol: string; planned: number; startedAt: string; answers: DocumentAnswer[] };
export type ReportPayload = {
  version: string; siteId: string; client: string; generatedAt: string;
  report: { id: string; status: string; createdAt: string; data: StoredReport["data"] };
  geo: DocumentGeo | null; geoRefreshFailed: boolean; sourceRefreshFailed: boolean;
  kind: ReportKind;
  /** Periodo misurato dal documento e, solo per il mensile, il mese precedente; i totali vengono dall'archivio Search Console. */
  period: (Window & { days: number; archivedDays: number }) | null;
  compare: (Window & { days: number; archivedDays: number }) | null;
  totals: { current: GscTotals; previous: GscTotals | null } | null;
  /** Punto di partenza del servizio (report Start-up): solo per il mensile, confrontato per clic al giorno. */
  metrics?: ReportMetrics;
  baseline?: { from: string; to: string; clicks: number; days: number } | null;
};
/** Le chiavi del documento dipendono dalle fonti, non dall'ora o da chi preme il pulsante. */
export function documentFingerprint(payload: ReportPayload) {
  return createHash("sha256").update(JSON.stringify({ version: payload.version, siteId: payload.siteId,
    kind: payload.kind, period: payload.period ? [payload.period.from, payload.period.to] : null, snapshotId: payload.report.id, geoScanId: payload.geo?.id ?? null, geoRefreshFailed: payload.geoRefreshFailed, sourceRefreshFailed: payload.sourceRefreshFailed, metrics: payload.metrics })).digest("hex");
}
export function documentStatus(payload: ReportPayload): "complete" | "partial" {
  const covered = (w: { days: number; archivedDays: number } | null) => !w || w.archivedDays >= w.days;
  const metricsComplete = !payload.metrics || [payload.metrics.current, payload.metrics.previous].filter(Boolean).every(m => m?.search && !m.search.truncated && !m.search.firstIncompleteDate && m.analytics?.reliable);
  return metricsComplete && covered(payload.period) && covered(payload.compare) && payload.report.status === "complete" && payload.geo?.status === "done" &&
    summarizeScan(payload.geo.answers as GeoAnswer[], payload.geo.planned).complete === payload.geo.planned && !payload.geoRefreshFailed && !payload.sourceRefreshFailed ? "complete" : "partial";
}
export function documentUrls(id: string) {
  return { id, url: `/report/documento/${id}`, pdfUrl: `/api/reports/${id}/pdf` };
}
