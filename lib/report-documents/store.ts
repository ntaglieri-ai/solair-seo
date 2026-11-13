import "server-only";
import { createHash } from "node:crypto";
import { getSql } from "../db";
import { readReport } from "../report-read";
import type { GeoAnswer } from "../geo/answer";
import { renderReportPdf } from "./render";
import { collectReportMetrics } from "./metrics";
import { searchTotals } from "./metric-summary";
import { archiveReportDocument } from "./archive";
import { getGscLastDate, getGscTotalsBetween } from "../engine/read";
import { getEngineSettings } from "../engine/store";
import { daysIn, documentFileName, resolveWindow, type ReportKind, type WindowError } from "./windows";
import { documentFingerprint, documentStatus, documentUrls, PDF_TEMPLATE_VERSION, UUID, type DocumentAnswer, type DocumentGeo, type ReportPayload } from "./model";
const SITE = "solairgroup.it";
export class ReportWindowError extends Error { constructor(readonly code: WindowError, readonly detail?: string) { super(code); } }

/** Fine del periodo coperto dall'ultimo documento di qualunque tipo: da lì parte l'aggiornamento on demand. */
async function previousDocumentEnd() {
  const [row] = await getSql()<{ end: string | null }[]>`select to_char(max(coalesce(period_to, (payload #>> '{report,data,windows,current,to}')::date)), 'YYYY-MM-DD') as end from seo.report_documents where site_id=${SITE}`;
  return row?.end ?? null;
}
/** Il primo documento in assoluto è il report Start-up; poi ogni richiesta manuale è un aggiornamento. */
async function defaultKind(): Promise<ReportKind> {
  const [row] = await getSql()<{ n: number }[]>`select count(*)::int as n from seo.report_documents where site_id=${SITE}`;
  return row.n ? "update" : "startup";
}
/** Punto di partenza: periodo e clic del report Start-up, se esiste. */
async function startupBaseline() {
  const [row] = await getSql()<{ period: ReportPayload["period"]; totals: ReportPayload["totals"] }[]>`
    select payload->'period' as period, payload->'totals' as totals from seo.report_documents where site_id=${SITE} and kind='startup' order by created_at limit 1`;
  return row?.period && row.totals ? { from: row.period.from, to: row.period.to, clicks: row.totals.current.clicks, days: row.period.archivedDays } : null;
}
export type DocumentMeta = { id: string; snapshotId: string; geoScanId: string | null; status: "complete" | "partial"; trigger: "manual" | "scheduled"; kind: ReportKind; createdAt: Date; from: string | null; to: string | null };

async function capturePayload(kind: ReportKind, snapshotId?: string, geoScanId?: string, geoRefreshFailed = false, sourceRefreshFailed = false): Promise<ReportPayload | null> {
  const report = await readReport(snapshotId);
  if (!report) return null;
  const periodicDays = kind === "monthly" ? (await getEngineSettings(SITE)).analysisDays : undefined;
  const resolved = resolveWindow({ kind, lastDate: await getGscLastDate(SITE), previousEnd: kind === "update" ? await previousDocumentEnd() : null, periodicDays });
  if (!resolved.ok) throw new ReportWindowError(resolved.error, resolved.detail);
  const measure = async (w: { from: string; to: string }) => { const totals = await getGscTotalsBetween(SITE, w.from, w.to); return { totals, window: { ...w, days: daysIn(w), archivedDays: totals.days } }; };
  const current = await measure(resolved.current), previous = resolved.compare ? await measure(resolved.compare) : null;
  if (!current.totals.days) throw new ReportWindowError("NO_DATA");
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
  const baseline = kind === "monthly" ? await startupBaseline().catch(() => null) : null;
  const metrics = await collectReportMetrics(SITE, resolved.current, resolved.compare);
  if (metrics.current.search?.daily.length) { current.totals = searchTotals(metrics.current.search.daily); current.window.archivedDays = current.totals.days; }
  if (previous && metrics.previous?.search?.daily.length) { previous.totals = searchTotals(metrics.previous.search.daily); previous.window.archivedDays = previous.totals.days; }
  return { metrics, version: PDF_TEMPLATE_VERSION, siteId: SITE, client: "Solair Group S.r.l.", generatedAt: new Date().toISOString(),
    report: { id: report.id, status: report.status, createdAt: new Date(report.createdAt).toISOString(), data: report.data }, geo: documentGeo, geoRefreshFailed, sourceRefreshFailed, baseline,
    kind, period: current.window, compare: previous?.window ?? null, totals: { current: current.totals, previous: previous?.totals ?? null } };
}

/** Un solo generatore e un solo formato per il pulsante manuale e il Cron. Nessuna chiamata AI qui. */
export async function generateReportDocument(options: { kind?: ReportKind; snapshotId?: string; geoScanId?: string; trigger: "manual" | "scheduled"; geoRefreshFailed?: boolean; sourceRefreshFailed?: boolean }) {
  const kind = options.kind ?? await defaultKind(), payload = await capturePayload(kind, options.snapshotId, options.geoScanId, options.geoRefreshFailed, options.sourceRefreshFailed);
  if (!payload) return null;
  return persistReportDocument(payload, options.trigger);
}

export async function persistReportDocument(payload: ReportPayload, trigger: "manual" | "scheduled") {
  const kind = payload.kind;
  const sql = getSql(), fingerprint = documentFingerprint(payload);
  const [existing] = await sql<{ id: string }[]>`select id from seo.report_documents where site_id=${SITE} and fingerprint=${fingerprint}`;
  if (existing) return { ...documentUrls(existing.id), reused: true, kind, archive: await archiveReportDocument(existing.id) };
  const bytes = await renderReportPdf(payload);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const [saved] = await sql<{ id: string }[]>`insert into seo.report_documents(site_id,snapshot_id,geo_scan_id,trigger,status,fingerprint,template_version,payload,pdf,sha256,kind,period_from,period_to)
    values(${SITE},${payload.report.id},${payload.geo?.id ?? null},${trigger},${documentStatus(payload)},${fingerprint},${PDF_TEMPLATE_VERSION},${sql.json(payload as never)},${bytes},${sha256},${kind},${payload.period?.from ?? null},${payload.period?.to ?? null})
    on conflict(site_id,fingerprint) do update set fingerprint=excluded.fingerprint returning id`;
  return { ...documentUrls(saved.id), reused: false, kind, archive: await archiveReportDocument(saved.id) };
}
export async function getDocumentArchive(limit = 20) {
  return getSql()<DocumentMeta[]>`select id,snapshot_id as "snapshotId",geo_scan_id as "geoScanId",status,trigger,kind,created_at as "createdAt",
    coalesce(period_from::text,payload #>> '{report,data,windows,current,from}') as "from",coalesce(period_to::text,payload #>> '{report,data,windows,current,to}') as "to"
    from seo.report_documents where site_id=${SITE} order by created_at desc limit ${limit}`;
}
export async function getReportDocument(id: string, withPdf = false) {
  if (!UUID.test(id)) return null;
  const sql = getSql();
  const [row] = await sql<{ id: string; payload: ReportPayload; status: "complete" | "partial"; trigger: string; kind: ReportKind; periodFrom: string | null; periodTo: string | null; sha256: string; createdAt: Date; pdf: Buffer | null }[]>`
    select id,payload,status,trigger,kind,to_char(period_from,'YYYY-MM-DD') as "periodFrom",to_char(period_to,'YYYY-MM-DD') as "periodTo",sha256,created_at as "createdAt",${withPdf ? sql`pdf` : sql`null`} as pdf
    from seo.report_documents where site_id=${SITE} and id=${id}`;
  return row ?? null;
}
/** Nome del file scaricato; se due documenti coprono lo stesso periodo il più recente prende un numero. */
export async function getDocumentFileName(document: NonNullable<Awaited<ReturnType<typeof getReportDocument>>>) {
  const period = document.periodFrom && document.periodTo ? { from: document.periodFrom, to: document.periodTo } : null;
  const [{ n }] = await getSql()<{ n: number }[]>`select count(*)::int as n from seo.report_documents where site_id=${SITE} and kind=${document.kind}
    and period_from is not distinct from ${document.periodFrom}::date and period_to is not distinct from ${document.periodTo}::date and created_at<=${document.createdAt}`;
  return documentFileName(document.kind, document.createdAt, period, n);
}
export async function getLatestDocument() {
  const [row] = await getSql()<{ id: string }[]>`select id from seo.report_documents where site_id=${SITE} order by created_at desc limit 1`;
  return row ?? null;
}

/** Correct an existing document without rerunning SEO analysis or Gemini, or sending email. */
export async function prepareReportRevision(id: string) {
  const original = await getReportDocument(id);
  if (!original?.payload.period) throw new Error("Documento senza periodo verificabile.");
  const payload: ReportPayload = structuredClone(original.payload);
  payload.version = PDF_TEMPLATE_VERSION;
  payload.generatedAt = new Date().toISOString();
  payload.metrics = await collectReportMetrics(SITE, payload.period!, payload.compare);
  if (payload.metrics.current.search?.daily.length && payload.totals) {
    payload.totals.current = searchTotals(payload.metrics.current.search.daily);
    payload.period!.archivedDays = payload.totals.current.days;
  }
  if (payload.compare && payload.metrics.previous?.search?.daily.length && payload.totals) {
    payload.totals.previous = searchTotals(payload.metrics.previous.search.daily);
    payload.compare.archivedDays = payload.totals.previous.days;
  }
  return payload;
}
