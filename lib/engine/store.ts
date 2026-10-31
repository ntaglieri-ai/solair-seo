import "server-only";
import { getSql } from "../db";
import type { EngineSettings } from "./settings";
import { validateSettings } from "./settings";
import type { Evidence, TechnicalEvidence } from "./analyze";

export async function getEngineSettings(siteId: string): Promise<EngineSettings> {
  const [row] = await getSql()<EngineSettings[]>`
    select enabled, collection_days as "collectionDays", technical_days as "technicalDays",
      analysis_days as "analysisDays", window_days as "windowDays", lag_days as "lagDays",
      max_pages as "maxPages", min_impressions as "minImpressions", min_sessions as "minSessions"
    from seo.engine_settings where site_id = ${siteId}
  `;
  if (!row) throw new Error("Configurazione motore assente per il sito.");
  return row;
}

export async function updateEngineSettings(siteId: string, value: unknown) {
  const patch = validateSettings(value);
  const rows = await getSql()`
    update seo.engine_settings set
      enabled = coalesce(${patch.enabled ?? null}, enabled),
      collection_days = coalesce(${patch.collectionDays ?? null}, collection_days),
      technical_days = coalesce(${patch.technicalDays ?? null}, technical_days),
      analysis_days = coalesce(${patch.analysisDays ?? null}, analysis_days),
      window_days = coalesce(${patch.windowDays ?? null}, window_days),
      lag_days = coalesce(${patch.lagDays ?? null}, lag_days),
      max_pages = coalesce(${patch.maxPages ?? null}, max_pages),
      min_impressions = coalesce(${patch.minImpressions ?? null}, min_impressions),
      min_sessions = coalesce(${patch.minSessions ?? null}, min_sessions), updated_at = now()
    where site_id = ${siteId} returning site_id
  `;
  if (!rows.length) throw new Error("Sito non configurato.");
  return getEngineSettings(siteId);
}

export type Batch<T> = { runId: string; data: T; createdAt: Date };

export async function getEngineInputs(siteId: string) {
  const sql = getSql();
  const [evidence, technical] = await Promise.all([
    sql<Batch<Evidence>[]>`
      select e.run_id as "runId", e.data, e.created_at as "createdAt"
      from seo.evidence_batches e join seo.runs r on r.id=e.run_id
      where e.site_id=${siteId} and r.status='ok' order by e.created_at desc limit 1
    `,
    sql<Batch<TechnicalEvidence & { maxPages: number }>[]>`
      select e.run_id as "runId", e.data, e.created_at as "createdAt"
      from seo.technical_batches e join seo.runs r on r.id=e.run_id
      where e.site_id=${siteId} and r.status='ok' order by e.created_at desc limit 1
    `,
  ]);
  return { evidence: evidence[0] ?? null, technical: technical[0] ?? null };
}

export async function getLastSnapshot(siteId: string) {
  const [snapshot] = await getSql()`
    select a.id, a.run_id as "runId", a.status, a.data, a.created_at as "createdAt", s.validated_at as "validatedAt"
    from seo.engine_state s join seo.analysis_snapshots a on a.id=s.snapshot_id
    where s.site_id=${siteId}
  `;
  return snapshot ?? null;
}

export async function acquireLease(siteId: string): Promise<string | null> {
  const [lease] = await getSql()<{ token: string }[]>`
    insert into seo.engine_leases(site_id, expires_at) values (${siteId}, now() + interval '10 minutes')
    on conflict(site_id) do update set token=gen_random_uuid(), expires_at=excluded.expires_at
    where seo.engine_leases.expires_at < now() returning token
  `;
  return lease?.token ?? null;
}

export async function releaseLease(siteId: string, token: string) {
  await getSql()`delete from seo.engine_leases where site_id=${siteId} and token=${token}`;
}
