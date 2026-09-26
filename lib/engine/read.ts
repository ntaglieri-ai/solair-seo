import "server-only";
import { getSql } from "../db";

/** Punto unico di lettura dei dati archiviati, usato dalle pagine. */

export type RunKind = "baseline" | "gsc" | "onpage" | "audit";

export type RunSummary = {
  id: string;
  kind: RunKind;
  trigger: "seed" | "cron" | "manual";
  status: "running" | "ok" | "error";
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
};

export type GscDay = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscTotals = {
  clicks: number;
  impressions: number;
  ctr: number;
  /** Posizione media ponderata sulle impressioni. */
  position: number;
  days: number;
};

export type GscTopRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type OnPageResult = {
  runId: string;
  kind: "onpage" | "audit";
  scannedAt: Date;
  url: string;
  score: number;
  deductions: string[];
};

/** Ultime rilevazioni del sito, più recenti prima. */
export async function getRecentRuns(siteId: string, limit = 20): Promise<RunSummary[]> {
  return getSql()<RunSummary[]>`
    select id, kind, trigger, status,
           started_at as "startedAt", finished_at as "finishedAt", error
    from seo.runs
    where site_id = ${siteId}
    order by started_at desc
    limit ${limit}
  `;
}

/** Ultima rilevazione riuscita per tipo (per gli indicatori di stato). */
export async function getLatestRuns(siteId: string): Promise<Partial<Record<RunKind, RunSummary>>> {
  const rows = await getSql()<RunSummary[]>`
    select distinct on (kind) id, kind, trigger, status,
           started_at as "startedAt", finished_at as "finishedAt", error
    from seo.runs
    where site_id = ${siteId} and status = 'ok'
    order by kind, started_at desc
  `;
  return Object.fromEntries(rows.map((row) => [row.kind, row]));
}

/** Serie giornaliera Search Console tra due date incluse (YYYY-MM-DD). */
export async function getGscSeries(siteId: string, from: string, to: string): Promise<GscDay[]> {
  return getSql()<GscDay[]>`
    select to_char(date, 'YYYY-MM-DD') as date, clicks, impressions, ctr, position
    from seo.gsc_daily
    where site_id = ${siteId} and date between ${from} and ${to}
    order by date
  `;
}

/** Totali Search Console sugli ultimi `days` giorni disponibili e sul periodo precedente. */
export async function getGscTotals(
  siteId: string,
  days = 28
): Promise<{ current: GscTotals; previous: GscTotals; lastDate: string | null }> {
  const sql = getSql();
  const [{ last }] = await sql<{ last: string | null }[]>`
    select to_char(max(date), 'YYYY-MM-DD') as last from seo.gsc_daily where site_id = ${siteId}
  `;
  const empty: GscTotals = { clicks: 0, impressions: 0, ctr: 0, position: 0, days: 0 };
  if (!last) return { current: empty, previous: empty, lastDate: null };

  const rows = await sql<(GscTotals & { period: "current" | "previous" })[]>`
    select
      case when date > ${last}::date - ${days}::int then 'current' else 'previous' end as period,
      coalesce(sum(clicks), 0)::int as clicks,
      coalesce(sum(impressions), 0)::int as impressions,
      coalesce(sum(clicks)::float / nullif(sum(impressions), 0), 0) as ctr,
      coalesce(sum(position * impressions) / nullif(sum(impressions), 0), 0) as position,
      count(*)::int as days
    from seo.gsc_daily
    where site_id = ${siteId} and date > ${last}::date - ${days * 2}::int
    group by 1
  `;
  const pick = (period: string) => {
    const row = rows.find((r) => r.period === period);
    return row ? { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position, days: row.days } : empty;
  };
  return { current: pick("current"), previous: pick("previous"), lastDate: last };
}

/** Query o pagine principali dall'ultima raccolta GSC riuscita. */
export async function getGscTop(
  siteId: string,
  dimension: "query" | "page",
  limit = 10
): Promise<{ rows: GscTopRow[]; periodStart: string | null; periodEnd: string | null }> {
  const rows = await getSql()<(GscTopRow & { periodStart: string; periodEnd: string })[]>`
    select t.key, t.clicks, t.impressions, t.ctr, t.position,
           to_char(t.period_start, 'YYYY-MM-DD') as "periodStart",
           to_char(t.period_end, 'YYYY-MM-DD') as "periodEnd"
    from seo.gsc_top t
    where t.dimension = ${dimension}
      and t.run_id = (
        select id from seo.runs
        where site_id = ${siteId} and kind = 'gsc' and status = 'ok'
        order by started_at desc limit 1
      )
    order by t.clicks desc, t.impressions desc
    limit ${limit}
  `;
  return {
    rows: rows.map(({ key, clicks, impressions, ctr, position }) => ({ key, clicks, impressions, ctr, position })),
    periodStart: rows[0]?.periodStart ?? null,
    periodEnd: rows[0]?.periodEnd ?? null,
  };
}

/** Storico delle analisi on-page e degli audit live, più recenti prima. */
export async function getOnPageHistory(siteId: string, limit = 20): Promise<OnPageResult[]> {
  return getSql()<OnPageResult[]>`
    select r.id as "runId", r.kind, r.started_at as "scannedAt", s.url, s.score, s.deductions
    from seo.onpage_scans s
    join seo.runs r on r.id = s.run_id
    where r.site_id = ${siteId} and r.status = 'ok'
    order by r.started_at desc
    limit ${limit}
  `;
}
