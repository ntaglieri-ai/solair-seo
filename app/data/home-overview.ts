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
