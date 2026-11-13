import type { GscDatasetRow } from "../gsc";
import type { AnalyticsPeriod } from "../engine/analyze";
/** GSC daily data, not the sum of visible query rows (privacy omissions). */
export function searchTotals(rows: GscDatasetRow[]) {
  const clicks = rows.reduce((n, r) => n + r.clicks, 0), impressions = rows.reduce((n, r) => n + r.impressions, 0);
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0,
    position: impressions ? rows.reduce((n, r) => n + r.position * r.impressions, 0) / impressions : 0,
    days: new Set(rows.map(r => r.keys[0])).size };
}
export function analyticsTotals(data: AnalyticsPeriod) {
  const totals = data.pages.reduce((a, p) => ({ sessions: a.sessions + p.sessions, engaged: a.engaged + p.engagedSessions,
    contactClicks: a.contactClicks + Math.max(0, p.contactEvents - p.formSubmissions), forms: a.forms + p.formSubmissions }), { sessions: 0, engaged: 0, contactClicks: 0, forms: 0 });
  return { ...totals, engagementRate: totals.sessions ? totals.engaged / totals.sessions : 0 };
}
