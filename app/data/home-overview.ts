import { STABLE_CLICKS_BAND } from "../../lib/report-presentation";

type PeriodCoverage = {
  lastDate: string | null;
  previousComplete: boolean;
  current: { days: number };
  previous: { days: number };
};

/** Un giorno senza righe potrebbe essere zero oppure un buco: niente delta incerti. */
export function hasComparableCoverage(data: PeriodCoverage | null, days: number) {
  return !!data?.lastDate && data.previousComplete && data.current.days === days && data.previous.days === days;
}

export function splitInterventions<T>(items: T[]) {
  return { primary: items.slice(0, 3), additional: items.slice(3) };
}

type SearchReading = PeriodCoverage & { current: { days: number; clicks: number }; previous: { days: number; clicks: number } };
type AnalyticsReading = PeriodCoverage & { current: { days: number; sessions: number }; previous: { days: number; sessions: number } };

/** L’indicatore in hero riguarda soltanto i clic, con copertura completa di entrambe le finestre. */
export function googleClickDirection(search: SearchReading | null): "up" | "down" | "flat" | "unavailable" {
  if (!search || !hasComparableCoverage(search, 28)) return "unavailable";
  const { clicks } = search.current, before = search.previous.clicks;
  if (before > 0 && Math.abs(clicks - before) / before < STABLE_CLICKS_BAND) return "flat";
  return clicks > before ? "up" : clicks < before ? "down" : "flat";
}

export function performanceReading(search: SearchReading | null, analytics: AnalyticsReading | null) {
  const neutral = { tone: "neutral", title: "I risultati disponibili per Solair Group.", detail: "Il confronto richiede due periodi completi e verificati." };
  if (!hasComparableCoverage(search, 28) || !search) return neutral;
  const direction = (current: number, previous: number) => previous === 0 ? Math.sign(current) : Math.abs((current - previous) / previous) < STABLE_CLICKS_BAND ? 0 : Math.sign(current - previous);
  const clicks = direction(search.current.clicks, search.previous.clicks);
  const comparableAnalytics = hasComparableCoverage(analytics, 28) && analytics?.lastDate === search.lastDate;
  const sessions = comparableAnalytics && analytics ? direction(analytics.current.sessions, analytics.previous.sessions) : null;
  if (clicks > 0 && sessions !== null && sessions < 0) return {
    tone: "mixed", title: "Più clic da Google, meno sessioni dalla ricerca organica.",
    detail: "Search Console e Analytics misurano aspetti diversi: il confronto delle sessioni riguarda soltanto la ricerca organica.",
  };
  if (clicks > 0) return { tone: "positive", title: "Da Google arrivano più clic al sito.", detail: "Un segnale positivo da consolidare con interventi mirati sulle pagine." };
  if (clicks < 0) return { tone: "attention", title: "Da Google arrivano meno clic al sito.", detail: "Un calo rispetto al periodo precedente, da approfondire prima di attribuirgli una causa." };
  return { tone: "neutral", title: "I clic da Google sono stabili.", detail: "La variazione rientra nella normale oscillazione tra periodi; le opportunità dipendono dalle singole pagine." };
}
