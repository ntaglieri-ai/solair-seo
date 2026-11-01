import "server-only";
import { queryGscDataset } from "../gsc";
import { queryGa4Landing } from "../ga4";
import { withRun, type Site, type Trigger } from "./collect";
import { analysisWindows, type EngineSettings } from "./settings";
import type { Evidence, Period, SearchPeriod } from "./analyze";
import { gatherSources } from "./quality";

async function searchPeriod(property: string, period: Period): Promise<SearchPeriod> {
  const [daily, pages, queryPages, queries] = await Promise.all([
    queryGscDataset(property, period, ["date"]),
    queryGscDataset(property, period, ["page"]),
    queryGscDataset(property, period, ["query", "page"]),
    queryGscDataset(property, period, ["query"]),
  ]);
  if (daily.truncated) throw new Error("Serie giornaliera Search Console incompleta.");
  const clicks = daily.rows.reduce((n, r) => n + r.clicks, 0);
  const impressions = daily.rows.reduce((n, r) => n + r.impressions, 0);
  return {
    pages: pages.rows, queryPages: queryPages.rows,
    queries: queries.rows, keywordRowsComplete: !queries.truncated,
    pagesComplete: !pages.truncated, queriesComplete: !queryPages.truncated,
    totals: { clicks, impressions, ctr: impressions ? clicks / impressions : 0,
      position: impressions ? daily.rows.reduce((n, r) => n + r.position * r.impressions, 0) / impressions : 0 },
  };
}

export async function collectEvidence(site: Site, settings: EngineSettings, trigger: Trigger, now: Date) {
  return withRun(site.id, "evidence", trigger, async (runId, sql) => {
    const windows = analysisWindows(now, settings.windowDays, settings.lagDays);
    const sources = await gatherSources(async () => {
      const [current, previous] = await Promise.all([searchPeriod(site.gsc_property, windows.current), searchPeriod(site.gsc_property, windows.previous)]);
      return { current, previous };
    }, site.ga4_property ? async () => {
      const [current, previous] = await Promise.all([queryGa4Landing(site.ga4_property!, windows.current), queryGa4Landing(site.ga4_property!, windows.previous)]);
      return { current, previous };
    } : null);
    const evidence: Evidence = {
      collectedAt: now.toISOString(), windows,
      gsc: sources.gsc, ga4: sources.ga4, sourceErrors: sources.sourceErrors,
    };
    await sql`
      insert into seo.evidence_batches(run_id, site_id, period_end, data)
      values (${runId}, ${site.id}, ${windows.current.to}, ${sql.json(evidence as never)})
    `;
    return {
      result: { periodEnd: windows.current.to, queryPages: sources.gsc.current.queryPages.length, pages: sources.gsc.current.pages.length, ga4LandingPages: sources.ga4?.current.pages.length ?? 0, sourceErrors: sources.sourceErrors },
      raw: { windows, dataState: "final", queryPrivacy: "known_queries_only", sourceErrors: sources.sourceErrors },
    };
  });
}
