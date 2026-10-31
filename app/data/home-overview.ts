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

export function performanceReading(search: SearchReading | null, analytics: AnalyticsReading | null) {
  const neutral = { tone: "neutral", title: "I risultati disponibili per Solair Group.", detail: "Il confronto richiede due periodi completi e verificati." };
  if (!hasComparableCoverage(search, 28) || !search) return neutral;
  const direction = (current: number, previous: number) => previous === 0 ? Math.sign(current) : Math.abs((current - previous) / previous) < 0.005 ? 0 : Math.sign(current - previous);
  const clicks = direction(search.current.clicks, search.previous.clicks);
  const comparableAnalytics = hasComparableCoverage(analytics, 28) && analytics?.lastDate === search.lastDate;
  const sessions = comparableAnalytics && analytics ? direction(analytics.current.sessions, analytics.previous.sessions) : null;
  if (clicks > 0 && sessions !== null && sessions < 0) return {
    tone: "mixed", title: "Google porta più clic. Il traffico complessivo rallenta.",
    detail: "Un segnale positivo dalla ricerca, con un calo delle sessioni totali da approfondire.",
  };
  if (clicks > 0) return { tone: "positive", title: "Da Google arrivano più clic al sito.", detail: "Un segnale positivo da consolidare con interventi mirati sulle pagine." };
  if (clicks < 0) return { tone: "attention", title: "Da Google arrivano meno clic al sito.", detail: "Un calo rispetto al periodo precedente, da approfondire prima di attribuirgli una causa." };
  return { tone: "neutral", title: "I clic da Google restano stabili.", detail: "Il volume è in linea con il periodo precedente; le opportunità dipendono dalle singole pagine." };
}
