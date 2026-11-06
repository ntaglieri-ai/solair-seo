import { createHash } from "node:crypto";
import type { StoredReport } from "../report-read";
import type { GeoAnswer } from "../geo/answer";
import { summarizeScan } from "../geo/summary";
export const PDF_TEMPLATE_VERSION = "solair-report-pdf-v1";
export const UUID = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;
export type DocumentAnswer = Omit<GeoAnswer, "estimatedUsd" | "searches" | "searchQueries" | "inputTokens" | "outputTokens">;
export type DocumentGeo = { id: string; status: string; model: string | null; protocol: string; planned: number; startedAt: string; answers: DocumentAnswer[] };
export type ReportPayload = {
  version: string; siteId: string; client: string; generatedAt: string;
  report: { id: string; status: string; createdAt: string; data: StoredReport["data"] };
  geo: DocumentGeo | null; geoRefreshFailed: boolean; sourceRefreshFailed: boolean;
};
/** Le chiavi del documento dipendono dalle fonti, non dall'ora o da chi preme il pulsante. */
export function documentFingerprint(payload: ReportPayload) {
  return createHash("sha256").update(JSON.stringify({ version: payload.version, siteId: payload.siteId,
    snapshotId: payload.report.id, geoScanId: payload.geo?.id ?? null, geoRefreshFailed: payload.geoRefreshFailed, sourceRefreshFailed: payload.sourceRefreshFailed })).digest("hex");
}
export function documentStatus(payload: ReportPayload): "complete" | "partial" {
  return payload.report.status === "complete" && payload.geo?.status === "done" &&
    summarizeScan(payload.geo.answers as GeoAnswer[], payload.geo.planned).complete === payload.geo.planned && !payload.geoRefreshFailed && !payload.sourceRefreshFailed ? "complete" : "partial";
}
export function documentUrls(id: string) {
  return { id, url: `/report/documento/${id}`, pdfUrl: `/api/reports/${id}/pdf` };
}
