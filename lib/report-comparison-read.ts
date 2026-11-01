import "server-only";
import { getSql } from "./db";
import type { StoredReport } from "./report-read";
import type { CrawlPage } from "./engine/crawl";
import type { Evidence } from "./engine/analyze";
import type { UrlAudit } from "./url-audit";

export type PublicBatch = { runId?: string; createdAt: Date; data: { version?: string; publicAnalysis?: UrlAudit; pages: CrawlPage[]; complete: boolean; sitemapFound: boolean; limitations: string[] } };
export async function readStandalonePublicBatch(runId?: string): Promise<PublicBatch | null> {
  if (runId && !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(runId)) return null;
  const rows = runId
    ? await getSql()<PublicBatch[]>`select t.run_id as "runId",t.created_at as "createdAt",t.data from seo.technical_batches t join seo.runs r on r.id=t.run_id where t.site_id='solairgroup.it' and r.status='ok' and t.run_id::text=${runId}`
    : await getSql()<PublicBatch[]>`select t.run_id as "runId",t.created_at as "createdAt",t.data from seo.technical_batches t join seo.runs r on r.id=t.run_id where t.site_id='solairgroup.it' and r.status='ok' order by t.created_at desc limit 1`;
  return rows[0] ?? null;
}
export async function readPublicBatch(report: StoredReport): Promise<PublicBatch | null> {
  const runId = report.data.sourceRunIds?.technical;
  if (!runId) return null;
  const [batch] = await getSql()<PublicBatch[]>`select created_at as "createdAt",data from seo.technical_batches where site_id='solairgroup.it' and run_id::text=${runId}`;
  return batch ?? null;
}
export async function readComparisonEvidence(report: StoredReport): Promise<Evidence | null> {
  const runId = report.data.sourceRunIds?.evidence;
  if (!runId || report.status === "blocked") return null;
  const [batch] = await getSql()<{data:Evidence}[]>`select data from seo.evidence_batches where site_id='solairgroup.it' and run_id::text=${runId}`;
  const evidence = batch?.data;
  if (!evidence || evidence.windows.current.from !== report.data.windows?.current.from || evidence.windows.current.to !== report.data.windows?.current.to) return null;
  return evidence;
}
