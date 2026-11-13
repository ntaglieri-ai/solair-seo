import type { ReportPayload } from "./model";
import { analyticsTotals } from "./metric-summary";
import { daysIn } from "./windows";
export function comparisonData(payload: ReportPayload) {
  const current = payload.metrics?.current, previous = payload.metrics?.previous;
  const hasWindow = !!payload.compare && !!payload.period && daysIn(payload.period) >= 3 && daysIn(payload.period) === daysIn(payload.compare);
  const searchReady = hasWindow && !!current?.search && !!previous?.search && !current.search.truncated && !previous.search.truncated &&
    !current.search.firstIncompleteDate && !previous.search.firstIncompleteDate && !!payload.totals?.previous &&
    payload.totals.current.days >= daysIn(payload.period!) && payload.totals.previous.days >= daysIn(payload.compare!);
  const analyticsReady = hasWindow && !!current?.analytics?.reliable && !!previous?.analytics?.reliable;
  return { searchReady, analyticsReady,
    currentAnalytics: current?.analytics ? analyticsTotals(current.analytics) : null,
    previousAnalytics: previous?.analytics ? analyticsTotals(previous.analytics) : null,
    reason: !hasWindow ? "Non ci sono ancora due periodi confrontabili. Il confronto sarà disponibile quando saranno raccolti dati sufficienti; per gli aggiornamenti servono almeno tre giorni nuovi."
      : "Il confronto usa periodi della stessa durata. Le voci senza dati completi o attendibili restano non disponibili; i dati recenti di Google possono essere ancora in elaborazione." };
}
