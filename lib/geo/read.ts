import "server-only";
import { getBudgetUsage, getGeoRequests, getGeoScans, getGeoSettings } from "./store";

export async function getGeoDashboard(siteId: string) {
  const [settings, usage, scans] = await Promise.all([getGeoSettings(siteId), getBudgetUsage(siteId), getGeoScans(siteId, 20)]);
  const history = await Promise.all(scans.map(async scan => ({ scan, requests: await getGeoRequests(scan.id) })));
  return { settings, usage, history };
}
