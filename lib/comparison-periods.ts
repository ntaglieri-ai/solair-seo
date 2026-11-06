import { analysisWindows } from "./engine/settings";
import { formatDate } from "./format";
import type { Period } from "./engine/analyze";

export const formatPeriod = (period: Period) => `${formatDate(period.from)} – ${formatDate(period.to)}`;
/** Usa la data finale della singola fonte, mai la data odierna. */
export function comparisonPeriods(lastDate: string, days = 28) {
  return analysisWindows(new Date(`${lastDate}T12:00:00Z`), days, 0);
}
