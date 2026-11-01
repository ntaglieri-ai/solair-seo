import "server-only";
import { getSql } from "./db";
import type { StoredReport } from "./report-read";
import type { CrawlPage } from "./engine/crawl";
import type { Evidence } from "./engine/analyze";

export type PublicBatch = { createdAt: Date; data: { pages: CrawlPage[]; complete: boolean; sitemapFound: boolean; limitations: string[] } };
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
