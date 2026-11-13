import "server-only";
import { getSql } from "../db";
import { queryGscDataset, type GscDatasetRow } from "../gsc";
import { queryGa4Landing } from "../ga4";
import type { AnalyticsPeriod } from "../engine/analyze";
import type { Window } from "./windows";

export type ReportMetricsPeriod = {
  period: Window;
  search: { queries: GscDatasetRow[]; pages: GscDatasetRow[]; daily: GscDatasetRow[]; truncated: boolean; firstIncompleteDate: string | null } | null;
  analytics: AnalyticsPeriod | null;
  limitations: string[];
};
export type ReportMetrics = { current: ReportMetricsPeriod; previous: ReportMetricsPeriod | null };

/** Freeze Google results for the exact document dates. Never reuse a different window. */
export async function collectReportMetrics(siteId: string, current: Window, previous: Window | null): Promise<ReportMetrics> {
  const [site] = await getSql()<{ gsc: string; ga4: string | null }[]>`select gsc_property as gsc,ga4_property as ga4 from seo.sites where id=${siteId}`;
  async function collect(window: Window): Promise<ReportMetricsPeriod> {
    const period = { from: window.from, to: window.to };
    const [search, analytics] = await Promise.allSettled([
      site?.gsc ? Promise.all([queryGscDataset(site.gsc, period, ["query"], "all"), queryGscDataset(site.gsc, period, ["page"], "all"), queryGscDataset(site.gsc, period, ["date"], "all")]) : Promise.reject(new Error("GSC non configurato")),
      site?.ga4 ? queryGa4Landing(site.ga4, period) : Promise.reject(new Error("GA4 non configurato")),
    ]);
    const limitations: string[] = [];
    if (search.status === "rejected") limitations.push("Dettaglio Search Console non disponibile per questo periodo; i totali eventualmente presenti provengono dall'archivio giornaliero.");
    if (analytics.status === "rejected") limitations.push("Dati Analytics non disponibili per questo periodo. I valori mancanti non sono zero.");
    const datasets = search.status === "fulfilled" ? search.value : null;
    datasets?.forEach(d => d.rows.sort((a, b) => a.keys.join("\t").localeCompare(b.keys.join("\t"))));
    if (datasets?.[2].firstIncompleteDate) limitations.push(`Search Console: i dati dal ${datasets[2].firstIncompleteDate} sono ancora in elaborazione da Google e possono cambiare.`);
    if (datasets?.some(d => d.truncated)) limitations.push("Search Console: dettaglio limitato dal numero massimo di righe recuperabili.");
    return { period, search: datasets ? { queries: datasets[0].rows, pages: datasets[1].rows, daily: datasets[2].rows, firstIncompleteDate: datasets[2].firstIncompleteDate ?? null, truncated: datasets.some(d => d.truncated) } : null,
      analytics: analytics.status === "fulfilled" ? analytics.value : null, limitations };
  }
  const [now, before] = await Promise.all([collect(current), previous ? collect(previous) : Promise.resolve(null)]);
  return { current: now, previous: before };
}
