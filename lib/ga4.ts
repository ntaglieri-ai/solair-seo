import { google } from "googleapis";
import { getOAuthClient } from "./gsc";

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
    });
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
