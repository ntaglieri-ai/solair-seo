import "server-only";
import type postgres from "postgres";
import { getSql } from "../db";
import { queryGsc } from "../gsc";
import { queryGa4Daily } from "../ga4";
import { scanOnPage, type OnPageData } from "../onpage-scan";
import { computeSeoScore } from "../seo-score";

export type Site = {
  id: string;
  home_url: string;
  gsc_property: string;
  ga4_property: string | null;
};

export type Trigger = "cron" | "manual";

/** Giorni di serie GSC riletti a ogni raccolta: Google rivede i dati recenti. */
const GSC_REFRESH_DAYS = 10;
/** Finestra per query e pagine principali. */
const GSC_TOP_WINDOW_DAYS = 28;
/** L'analisi on-page automatica gira al massimo una volta ogni 7 giorni. */
const ONPAGE_INTERVAL_DAYS = 7;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

export async function getSites(): Promise<Site[]> {
  return getSql()<Site[]>`select id, home_url, gsc_property, ga4_property from seo.sites order by id`;
}

export async function getSite(id: string): Promise<Site | null> {
  const [site] = await getSql()<Site[]>`
    select id, home_url, gsc_property, ga4_property from seo.sites where id = ${id}
  `;
  return site ?? null;
}

/**
 * Apre una rilevazione, esegue `work` e la chiude come ok o error.
 * L'errore viene salvato e poi rilanciato al chiamante.
 */
async function withRun<T>(
  siteId: string,
  kind: "gsc" | "ga4" | "onpage" | "audit",
  trigger: Trigger,
  work: (runId: string, sql: postgres.Sql) => Promise<{ result: T; raw: unknown }>
): Promise<{ runId: string; result: T }> {
  const sql = getSql();
  const [run] = await sql<{ id: string }[]>`
    insert into seo.runs (site_id, kind, trigger)
    values (${siteId}, ${kind}, ${trigger})
    returning id
  `;

  try {
    const { result, raw } = await work(run.id, sql);
    await sql`
      update seo.runs
      set status = 'ok', finished_at = now(), raw = ${sql.json(raw as postgres.JSONValue)}
      where id = ${run.id}
    `;
    return { runId: run.id, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sql`
      update seo.runs
      set status = 'error', finished_at = now(), error = ${message}
      where id = ${run.id}
    `;
    throw err;
  }
}

/**
 * Search Console: aggiorna la serie giornaliera (ultimi `days` giorni) e
 * fotografa le 25 query e 25 pagine principali degli ultimi 28 giorni.
 */
export async function collectGsc(
  site: Site,
  trigger: Trigger,
  days: number = GSC_REFRESH_DAYS
) {
  return withRun(site.id, "gsc", trigger, async (runId, sql) => {
    const endDate = isoDate(daysAgo(1));
    const topStart = isoDate(daysAgo(GSC_TOP_WINDOW_DAYS));

    const [daily, queries, pages] = await Promise.all([
      queryGsc(site.gsc_property, {
        startDate: isoDate(daysAgo(days)),
        endDate,
        dimension: "date",
        rowLimit: Math.max(days, 1),
      }),
      queryGsc(site.gsc_property, { startDate: topStart, endDate, dimension: "query", rowLimit: 25 }),
      queryGsc(site.gsc_property, { startDate: topStart, endDate, dimension: "page", rowLimit: 25 }),
    ]);

    await sql.begin(async (tx) => {
      for (const row of daily) {
        await tx`
          insert into seo.gsc_daily (site_id, date, clicks, impressions, ctr, position)
          values (${site.id}, ${row.key}, ${row.clicks}, ${row.impressions}, ${row.ctr}, ${row.position})
          on conflict (site_id, date) do update set
            clicks = excluded.clicks,
            impressions = excluded.impressions,
            ctr = excluded.ctr,
            position = excluded.position,
            updated_at = now()
        `;
      }

      const top = [
        ...queries.map((row) => ({ ...row, dimension: "query" })),
        ...pages.map((row) => ({ ...row, dimension: "page" })),
      ].map((row) => ({
        run_id: runId,
        dimension: row.dimension,
        key: row.key,
        period_start: topStart,
        period_end: endDate,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      }));
      if (top.length > 0) {
        await tx`insert into seo.gsc_top ${tx(top)}`;
      }
    });

    const summary = { days: daily.length, queries: queries.length, pages: pages.length };
    return { result: summary, raw: { period: { start: topStart, end: endDate }, daily, queries, pages } };
  });
}

/**
 * GA4: aggiorna la serie giornaliera (totale e per canale) degli ultimi
 * `days` giorni. Restituisce null se il sito non ha una proprietà GA4.
 */
export async function collectGa4(site: Site, trigger: Trigger, days: number = GSC_REFRESH_DAYS) {
  const propertyId = site.ga4_property;
  if (!propertyId) return null;

  return withRun(site.id, "ga4", trigger, async (_runId, sql) => {
    const rows = await queryGa4Daily(propertyId, isoDate(daysAgo(days)), isoDate(daysAgo(1)));

    await sql.begin(async (tx) => {
      for (const row of rows) {
        await tx`
          insert into seo.ga4_daily
            (site_id, date, channel, sessions, users, new_users, engaged_sessions, key_events)
          values (${site.id}, ${row.date}, ${row.channel}, ${row.sessions}, ${row.users},
                  ${row.newUsers}, ${row.engagedSessions}, ${row.keyEvents})
          on conflict (site_id, date, channel) do update set
            sessions = excluded.sessions,
            users = excluded.users,
            new_users = excluded.new_users,
            engaged_sessions = excluded.engaged_sessions,
            key_events = excluded.key_events,
            updated_at = now()
        `;
      }
    });

    const dates = new Set(rows.map((row) => row.date));
    return { result: { days: dates.size, rows: rows.length }, raw: { property: propertyId, rows } };
  });
}

async function saveOnPage(
  sql: postgres.Sql,
  runId: string,
  onpage: OnPageData,
  score: number,
  deductions: string[]
) {
  await sql`
    insert into seo.onpage_scans (run_id, url, score, deductions, data)
    values (${runId}, ${onpage.url}, ${score}, ${sql.json(deductions)}, ${sql.json(onpage as unknown as postgres.JSONValue)})
  `;
}

/** Analisi on-page della home del sito, con score. */
export async function collectOnPage(site: Site, trigger: Trigger) {
  return withRun(site.id, "onpage", trigger, async (runId, sql) => {
    const onpage = await scanOnPage(site.home_url);
    // Lo score considera anche la presenza di dati GSC: li leggiamo dall'archivio.
    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int as count from seo.gsc_daily
      where site_id = ${site.id} and date >= ${isoDate(daysAgo(GSC_TOP_WINDOW_DAYS))}
    `;
    const { score, deductions } = computeSeoScore(onpage, count > 0);
    await saveOnPage(sql, runId, onpage, score, deductions);
    return { result: { score }, raw: { onpage, score, deductions } };
  });
}

/** True se l'ultima analisi on-page riuscita è più vecchia dell'intervallo. */
export async function isOnPageDue(siteId: string): Promise<boolean> {
  const [row] = await getSql()<{ due: boolean }[]>`
    select coalesce(max(started_at) < now() - make_interval(days => ${ONPAGE_INTERVAL_DAYS}), true) as due
    from seo.runs
    where site_id = ${siteId} and kind in ('onpage', 'audit') and status = 'ok'
  `;
  return row.due;
}

/**
 * Salva il risultato di un audit live già calcolato da /api/scan.
 * L'URL può essere di qualsiasi sito: si archivia solo se il dominio è
 * tra quelli monitorati.
 */
export async function recordAudit(
  domain: string,
  audit: { onpage: OnPageData; score: number; deductions: string[]; raw: unknown }
): Promise<string | null> {
  const site = await getSite(domain);
  if (!site) return null;

  const { runId } = await withRun(site.id, "audit", "manual", async (id, sql) => {
    await saveOnPage(sql, id, audit.onpage, audit.score, audit.deductions);
    return { result: null, raw: audit.raw };
  });
  return runId;
}
