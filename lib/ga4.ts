import { google } from "googleapis";
import { getOAuthClient } from "./gsc";
import { readAllRows } from "./engine/pagination";
import { CONTACT_EVENTS } from "./engine/contacts";

export type Ga4DailyRow = {
  date: string;
  channel: string;
  sessions: number;
  users: number;
  newUsers: number;
  engagedSessions: number;
  keyEvents: number;
};

const METRICS = ["sessions", "totalUsers", "newUsers", "engagedSessions", "keyEvents"];

/** "20260925" → "2026-09-25". */
function toIsoDate(value: string): string {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

/**
 * Metriche GA4 giornaliere, sia totali del sito (channel "all") sia per
 * Default Channel Group. Date in formato YYYY-MM-DD nel fuso della proprietà.
 * Gli errori non vengono assorbiti: la rilevazione risulta fallita.
 */
export async function queryGa4Daily(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<Ga4DailyRow[]> {
  const analyticsdata = google.analyticsdata({ version: "v1beta", auth: getOAuthClient() });
  const metrics = METRICS.map((name) => ({ name }));
  const dateRanges = [{ startDate, endDate }];

  const run = async (dimensions: string[]) => {
    const { data } = await analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges,
        dimensions: dimensions.map((name) => ({ name })),
        metrics,
        limit: "100000",
      },
    }, { timeout: 20000 });
    return data.rows ?? [];
  };

  const [totals, byChannel] = await Promise.all([run(["date"]), run(["date", "sessionDefaultChannelGroup"])]);

  const toRow = (dimensionValues: string[], metricValues: string[]): Ga4DailyRow => {
    const [sessions, users, newUsers, engagedSessions, keyEvents] = metricValues.map(Number);
    return {
      date: toIsoDate(dimensionValues[0]),
      channel: dimensionValues[1] ?? "all",
      sessions,
      users,
      newUsers,
      engagedSessions,
      keyEvents,
    };
  };

  return [...totals, ...byChannel].map((row) =>
    toRow(
      (row.dimensionValues ?? []).map((v) => v.value ?? ""),
      (row.metricValues ?? []).map((v) => v.value ?? "0")
    )
  );
}

export type Ga4EventRow = {
  date: string;
  eventName: string;
  eventCount: number;
  users: number;
};

export type LandingPage = { page: string; sessions: number; engagedSessions: number; contactEvents: number; formSubmissions: number };

/** Sessioni Google/organic ed eventi associati alla pagina di ingresso, non alla query. */
export async function queryGa4Landing(propertyId: string, period: { from: string; to: string }) {
  const api = google.analyticsdata({ version: "v1beta", auth: getOAuthClient() });
  const limitations = new Set<string>();
  const timeZones = new Set<string>();
  let reliable = true;
  const dimensionFilter = { andGroup: { expressions: [
    { filter: { fieldName: "sessionSource", stringFilter: { matchType: "EXACT", value: "google" } } },
    { filter: { fieldName: "sessionMedium", stringFilter: { matchType: "EXACT", value: "organic" } } },
  ] } };
  async function report(dimensions: string[], metrics: string[], contactsOnly = false) {
    const result = await readAllRows(async (offset, limit) => {
      const expressions: object[] = [...dimensionFilter.andGroup.expressions];
      if (contactsOnly) expressions.push({ filter: { fieldName: "eventName", inListFilter: { values: CONTACT_EVENTS.map((e) => e.name) } } });
      const { data } = await api.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: period.from, endDate: period.to }],
          dimensions: dimensions.map((name) => ({ name })), metrics: metrics.map((name) => ({ name })),
          dimensionFilter: { andGroup: { expressions } },
          offset: String(offset), limit: String(limit),
          orderBys: dimensions.map((dimensionName) => ({ dimension: { dimensionName } })),
        },
      }, { timeout: 20000 });
      const metadata = data.metadata;
      if (metadata?.timeZone) timeZones.add(metadata.timeZone);
      if (metadata?.subjectToThresholding || metadata?.dataLossFromOtherRow || metadata?.samplingMetadatas?.length) {
        reliable = false;
        limitations.add("GA4 segnala soglie privacy, campionamento o righe aggregate: confronto conversioni non utilizzabile.");
      }
      return { rows: data.rows ?? [], total: data.rowCount ?? undefined };
    }, 10000);
    if (result.truncated) { reliable = false; limitations.add("Dataset GA4 oltre il limite di sicurezza di 50.000 righe."); }
    return result.rows;
  }
  const [sessions, events] = await Promise.all([
    report(["landingPage"], ["sessions", "engagedSessions"]),
    report(["landingPage", "eventName"], ["eventCount"], true),
  ]);
  const pages = new Map<string, LandingPage>();
  const page = (key: string) => {
    if (!pages.has(key)) pages.set(key, { page: key, sessions: 0, engagedSessions: 0, contactEvents: 0, formSubmissions: 0 });
    return pages.get(key)!;
  };
  for (const row of sessions) {
    const target = page(row.dimensionValues?.[0]?.value ?? "(not set)");
    target.sessions += Number(row.metricValues?.[0]?.value ?? 0);
    target.engagedSessions += Number(row.metricValues?.[1]?.value ?? 0);
  }
  for (const row of events) {
    const target = page(row.dimensionValues?.[0]?.value ?? "(not set)");
    const count = Number(row.metricValues?.[0]?.value ?? 0);
    target.contactEvents += count;
    if (row.dimensionValues?.[1]?.value === "lead_submit") target.formSubmissions += count;
  }
  if (pages.has("(not set)")) limitations.add("Alcune sessioni o interazioni GA4 non hanno una pagina di ingresso attribuita.");
  return { pages: [...pages.values()], reliable, timeZones: [...timeZones], limitations: [...limitations] };
}

/** Conteggio giornaliero di ogni evento GA4, per nome. */
export async function queryGa4Events(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<Ga4EventRow[]> {
  const analyticsdata = google.analyticsdata({ version: "v1beta", auth: getOAuthClient() });
  const { data } = await analyticsdata.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }, { name: "eventName" }],
      metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
      limit: "100000",
    },
  }, { timeout: 20000 });

  return (data.rows ?? []).map((row) => {
    const [date, eventName] = (row.dimensionValues ?? []).map((v) => v.value ?? "");
    const [eventCount, users] = (row.metricValues ?? []).map((v) => Number(v.value ?? 0));
    return { date: toIsoDate(date), eventName, eventCount, users };
  });
}
