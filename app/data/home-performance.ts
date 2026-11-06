import "server-only";
import { cache } from "react";
import { getGa4Totals, getGscTotals } from "../../lib/engine/read";
import { safeRead } from "../../lib/engine/safe";
export const readHomePerformance = cache(async (siteId: string) => {
  const [gsc, ga4] = await Promise.all([
    safeRead("home gsc", () => getGscTotals(siteId, 28)),
    safeRead("home ga4", () => getGa4Totals(siteId, 28)),
  ]);
  return { gsc, ga4 };
});
