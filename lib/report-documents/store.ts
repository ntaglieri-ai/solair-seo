import "server-only";
import { createHash } from "node:crypto";
import { getSql } from "../db";
import { readReport } from "../report-read";
import type { GeoAnswer } from "../geo/answer";
import { renderReportPdf } from "./render";
import { documentFingerprint, documentStatus, documentUrls, PDF_TEMPLATE_VERSION, UUID, type DocumentAnswer, type DocumentGeo, type ReportPayload } from "./model";
const SITE = "solairgroup.it";
export type DocumentMeta = { id: string; snapshotId: string; geoScanId: string | null; status: "complete" | "partial"; trigger: "manual" | "scheduled"; createdAt: Date; from: string | null; to: string | null };

async function capturePayload(snapshotId?: string, geoScanId?: string, geoRefreshFailed = false, sourceRefreshFailed = false): Promise<ReportPayload | null> {
  const report = await readReport(snapshotId);
  if (!report) return null;
  const sql = getSql();
  const [geo] = await sql<{ id: string; status: string; model: string | null; protocol: string; planned: number; startedAt: Date }[]>`
    select id,status,model,prompt_set_version as protocol,planned_prompts as planned,started_at as "startedAt"
    from seo.geo_scans where site_id=${SITE} and engine='gemini'
      and (${geoScanId ?? null}::uuid is null or id=${geoScanId ?? null}::uuid)
      and status<>'running' and (${snapshotId && !geoScanId ? new Date(report.createdAt) : null}::timestamptz is null
        or started_at<=${snapshotId && !geoScanId ? new Date(report.createdAt) : null})
    order by started_at desc limit 1`;
  if (geoScanId && !geo) throw new Error("GEO_NOT_READY");
  let documentGeo: DocumentGeo | null = null;
  if (geo) {
    const rows = await sql<{ result: GeoAnswer | null }[]>`select result from seo.geo_scan_requests where scan_id=${geo.id} order by created_at`;
    const answers: DocumentAnswer[] = rows.flatMap(row => row.result ? [{ engine: row.result.engine, model: row.result.model, protocol: row.result.protocol,
      promptId: row.result.promptId, question: row.result.question, intent: row.result.intent, collectedAt: row.result.collectedAt,
      answer: row.result.answer, complete: row.result.complete, mentioned: row.result.mentioned, citations: row.result.citations,
      citedSolair: row.result.citedSolair, competitorsMentioned: row.result.competitorsMentioned ?? [], reviewNotes: row.result.reviewNotes }] : []);
    documentGeo = { ...geo, startedAt: new Date(geo.startedAt).toISOString(), answers };
  }
  return { version: PDF_TEMPLATE_VERSION, siteId: SITE, client: "Solair Group S.r.l.", generatedAt: new Date().toISOString(),
    report: { id: report.id, status: report.status, createdAt: new Date(report.createdAt).toISOString(), data: report.data }, geo: documentGeo, geoRefreshFailed, sourceRefreshFailed };
}

/** Un solo generatore e un solo formato per il pulsante manuale e il Cron. Nessuna chiamata AI qui. */
export async function generateReportDocument(options: { snapshotId?: string; geoScanId?: string; trigger: "manual" | "scheduled"; geoRefreshFailed?: boolean; sourceRefreshFailed?: boolean }) {
  const payload = await capturePayload(options.snapshotId, options.geoScanId, options.geoRefreshFailed, options.sourceRefreshFailed);
  if (!payload) return null;
  const sql = getSql(), fingerprint = documentFingerprint(payload);
  const [existing] = await sql<{ id: string }[]>`select id from seo.report_documents where site_id=${SITE} and fingerprint=${fingerprint}`;
  if (existing) return { ...documentUrls(existing.id), reused: true };
  const bytes = await renderReportPdf(payload);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const [saved] = await sql<{ id: string }[]>`insert into seo.report_documents(site_id,snapshot_id,geo_scan_id,trigger,status,fingerprint,template_version,payload,pdf,sha256)
    values(${SITE},${payload.report.id},${payload.geo?.id ?? null},${options.trigger},${documentStatus(payload)},${fingerprint},${PDF_TEMPLATE_VERSION},${sql.json(payload as never)},${bytes},${sha256})
    on conflict(site_id,fingerprint) do update set fingerprint=excluded.fingerprint returning id`;
  return { ...documentUrls(saved.id), reused: false };
}
export async function getDocumentArchive(limit = 20) {
  return getSql()<DocumentMeta[]>`select id,snapshot_id as "snapshotId",geo_scan_id as "geoScanId",status,trigger,created_at as "createdAt",
    payload #>> '{report,data,windows,current,from}' as "from",payload #>> '{report,data,windows,current,to}' as "to"
    from seo.report_documents where site_id=${SITE} order by created_at desc limit ${limit}`;
}
export async function getReportDocument(id: string, withPdf = false) {
  if (!UUID.test(id)) return null;
  const sql = getSql();
  const [row] = await sql<{ id: string; payload: ReportPayload; status: "complete" | "partial"; trigger: string; sha256: string; createdAt: Date; pdf: Buffer | null }[]>`
    select id,payload,status,trigger,sha256,created_at as "createdAt",${withPdf ? sql`pdf` : sql`null`} as pdf
    from seo.report_documents where site_id=${SITE} and id=${id}`;
  return row ?? null;
}
export async function getLatestDocument() {
  const [row] = await getSql()<{ id: string }[]>`select id from seo.report_documents where site_id=${SITE} order by created_at desc limit 1`;
  return row ?? null;
}
