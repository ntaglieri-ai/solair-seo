import "server-only";
import { google } from "googleapis";
import { getOAuthClient } from "./gsc";
import { CONFIGURATOR_EVENTS, reportQuality, type ConfiguratorReport } from "./configurator";

export async function queryConfigurator(property: string, from: string, to: string): Promise<ConfiguratorReport> {
  const api = google.analyticsdata({ version: "v1beta", auth: getOAuthClient() });
  const organic = { filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { matchType: "EXACT", value: "Organic Search" } } };
  const [events, views] = await Promise.all([
    api.properties.runReport({ property: `properties/${property}`, requestBody: {
      dateRanges: [{ startDate: from, endDate: to }], dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }],
      dimensionFilter: { andGroup: { expressions: [organic, { filter: { fieldName: "eventName", inListFilter: { values: [...CONFIGURATOR_EVENTS] } } }] } }, limit: "100",
    } }, { timeout: 20000 }),
    api.properties.runReport({ property: `properties/${property}`, requestBody: {
      dateRanges: [{ startDate: from, endDate: to }], metrics: [{ name: "screenPageViews" }],
      dimensionFilter: { andGroup: { expressions: [organic, { filter: { fieldName: "pagePath", stringFilter: { matchType: "FULL_REGEXP", value: "/configuratore/?|/configuratore-solair-v[0-9]+\\.html" } } }] } },
    } }, { timeout: 20000 }),
  ]);
  const limitations = [...new Set([...reportQuality(events.data.metadata), ...reportQuality(views.data.metadata)])];
  return { from, to, channel: "Organic Search", pageViews: Number(views.data.rows?.[0]?.metricValues?.[0]?.value ?? 0),
    events: Object.fromEntries(CONFIGURATOR_EVENTS.map((name) => [name, Number(events.data.rows?.find((row) => row.dimensionValues?.[0]?.value === name)?.metricValues?.[0]?.value ?? 0)])),
    reliable: limitations.length === 0, limitations, timeZone: events.data.metadata?.timeZone ?? null };
}
