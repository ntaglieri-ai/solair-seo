import "server-only";
import { getSql } from "../db";

/** Punto unico di lettura dei dati archiviati, usato dalle pagine. */

export type RunKind = "baseline" | "gsc" | "ga4" | "onpage" | "audit";

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
): Promise<{
  current: GscTotals;
  previous: GscTotals;
  lastDate: string | null;
  /** False se l'archivio non copre tutto il periodo precedente. */
  previousComplete: boolean;
}> {
  const sql = getSql();
  const [{ last, complete }] = await sql<{ last: string | null; complete: boolean | null }[]>`
    select to_char(max(date), 'YYYY-MM-DD') as last,
           min(date) <= max(date) - ${days * 2 - 1}::int as complete
    from seo.gsc_daily where site_id = ${siteId}
  `;
  const empty: GscTotals = { clicks: 0, impressions: 0, ctr: 0, position: 0, days: 0 };
  if (!last) return { current: empty, previous: empty, lastDate: null, previousComplete: false };

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
  return { current: pick("current"), previous: pick("previous"), lastDate: last, previousComplete: Boolean(complete) };
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

export type GscPeriod = {
  /** Primo giorno del periodo (YYYY-MM-DD). */
  start: string;
  clicks: number;
  impressions: number;
  /** Posizione media ponderata; null se nessuna impressione. */
  position: number | null;
};

/**
 * Clic e impressioni per settimana (lunedì-domenica) nelle ultime `weeks`
 * settimane fino all'ultimo giorno disponibile. Le settimane senza dati
 * valgono zero: Search Console non restituisce i giorni vuoti.
 */
export async function getGscWeekly(siteId: string, weeks = 26): Promise<GscPeriod[]> {
  return getSql()<GscPeriod[]>`
    with bounds as (
      select date_trunc('week', max(date))::date as last_week
      from seo.gsc_daily where site_id = ${siteId}
    ),
    weeks as (
      select generate_series(last_week - (${weeks - 1}::int * 7), last_week, interval '7 days')::date as start
      from bounds where last_week is not null
    )
    select to_char(w.start, 'YYYY-MM-DD') as start,
           coalesce(sum(d.clicks), 0)::int as clicks,
           coalesce(sum(d.impressions), 0)::int as impressions,
           sum(d.position * d.impressions) / nullif(sum(d.impressions), 0) as position
    from weeks w
    left join seo.gsc_daily d
      on d.site_id = ${siteId} and d.date >= w.start and d.date < w.start + 7
    group by w.start
    order by w.start
  `;
}

/** Totali Search Console per mese, dal primo all'ultimo mese con dati. */
export async function getGscMonthly(siteId: string): Promise<GscPeriod[]> {
  return getSql()<GscPeriod[]>`
    with bounds as (
      select date_trunc('month', min(date))::date as first_month,
             date_trunc('month', max(date))::date as last_month
      from seo.gsc_daily where site_id = ${siteId}
    ),
    months as (
      select generate_series(first_month, last_month, interval '1 month')::date as start
      from bounds where first_month is not null
    )
    select to_char(m.start, 'YYYY-MM-DD') as start,
           coalesce(sum(d.clicks), 0)::int as clicks,
           coalesce(sum(d.impressions), 0)::int as impressions,
           sum(d.position * d.impressions) / nullif(sum(d.impressions), 0) as position
    from months m
    left join seo.gsc_daily d
      on d.site_id = ${siteId} and date_trunc('month', d.date) = m.start
    group by m.start
    order by m.start
  `;
}

export type Ga4Totals = {
  sessions: number;
  engagedSessions: number;
  /** Sessioni con coinvolgimento / sessioni. */
  engagementRate: number;
  keyEvents: number;
  /** Sessioni dal canale "Organic Search". */
  organicSessions: number;
  days: number;
};

/**
 * Totali GA4 sugli ultimi `days` giorni disponibili e sul periodo precedente.
 * Gli utenti non si sommano tra giorni (contano doppio), quindi non sono qui.
 */
export async function getGa4Totals(
  siteId: string,
  days = 28
): Promise<{
  current: Ga4Totals;
  previous: Ga4Totals;
  lastDate: string | null;
  /** False se l'archivio non copre tutto il periodo precedente. */
  previousComplete: boolean;
}> {
  const sql = getSql();
  const [{ last, complete }] = await sql<{ last: string | null; complete: boolean | null }[]>`
    select to_char(max(date), 'YYYY-MM-DD') as last,
           min(date) <= max(date) - ${days * 2 - 1}::int as complete
    from seo.ga4_daily where site_id = ${siteId} and channel = 'all'
  `;
  const empty: Ga4Totals = {
    sessions: 0,
    engagedSessions: 0,
    engagementRate: 0,
    keyEvents: 0,
    organicSessions: 0,
    days: 0,
  };
  if (!last) return { current: empty, previous: empty, lastDate: null, previousComplete: false };

  const rows = await sql<(Ga4Totals & { period: "current" | "previous" })[]>`
    select
      case when date > ${last}::date - ${days}::int then 'current' else 'previous' end as period,
      coalesce(sum(sessions) filter (where channel = 'all'), 0)::int as sessions,
      coalesce(sum(engaged_sessions) filter (where channel = 'all'), 0)::int as "engagedSessions",
      coalesce(
        sum(engaged_sessions) filter (where channel = 'all')::float
          / nullif(sum(sessions) filter (where channel = 'all'), 0),
        0
      ) as "engagementRate",
      coalesce(sum(key_events) filter (where channel = 'all'), 0)::float as "keyEvents",
      coalesce(sum(sessions) filter (where channel = 'Organic Search'), 0)::int as "organicSessions",
      count(distinct date) filter (where channel = 'all')::int as days
    from seo.ga4_daily
    where site_id = ${siteId} and date > ${last}::date - ${days * 2}::int
    group by 1
  `;
  const pick = (period: string) => {
    const row = rows.find((r) => r.period === period);
    if (!row) return empty;
    const { sessions, engagedSessions, engagementRate, keyEvents, organicSessions, days: count } = row;
    return { sessions, engagedSessions, engagementRate, keyEvents, organicSessions, days: count };
  };
  return { current: pick("current"), previous: pick("previous"), lastDate: last, previousComplete: Boolean(complete) };
}

export type EventTotals = {
  name: string;
  current: number;
  previous: number;
};

/**
 * Conteggi di eventi GA4 scelti sugli ultimi `days` giorni disponibili e sul
 * periodo precedente, con l'indicazione se il periodo precedente è completo.
 */
export async function getGa4EventTotals(
  siteId: string,
  eventNames: string[],
  days = 28
): Promise<{ events: EventTotals[]; lastDate: string | null; previousComplete: boolean }> {
  const sql = getSql();
  const [{ last, complete }] = await sql<{ last: string | null; complete: boolean | null }[]>`
    select to_char(max(date), 'YYYY-MM-DD') as last,
           min(date) <= max(date) - ${days * 2 - 1}::int as complete
    from seo.ga4_events where site_id = ${siteId}
  `;
  if (!last) {
    return {
      events: eventNames.map((name) => ({ name, current: 0, previous: 0 })),
      lastDate: null,
      previousComplete: false,
    };
  }

  const rows = await sql<{ name: string; current: number; previous: number }[]>`
    select event_name as name,
           coalesce(sum(event_count) filter (where date > ${last}::date - ${days}::int), 0)::int as current,
           coalesce(sum(event_count) filter (where date <= ${last}::date - ${days}::int), 0)::int as previous
    from seo.ga4_events
    where site_id = ${siteId}
      and event_name in ${sql(eventNames)}
      and date > ${last}::date - ${days * 2}::int
    group by event_name
  `;
  return {
    events: eventNames.map(
      (name) => rows.find((row) => row.name === name) ?? { name, current: 0, previous: 0 }
    ),
    lastDate: last,
    previousComplete: Boolean(complete),
  };
}

/** Clic Search Console tra due date incluse (YYYY-MM-DD), con i giorni archiviati. */
export async function getGscClicksBetween(
  siteId: string,
  from: string,
  to: string
): Promise<{ clicks: number; days: number }> {
  const [row] = await getSql()<{ clicks: number; days: number }[]>`
    select coalesce(sum(clicks), 0)::int as clicks, count(*)::int as days
    from seo.gsc_daily
    where site_id = ${siteId} and date between ${from} and ${to}
  `;
  return row;
}
