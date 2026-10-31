export type EngineSettings = {
  enabled: boolean;
  collectionDays: number;
  technicalDays: number;
  analysisDays: number;
  windowDays: number;
  lagDays: number;
  maxPages: number;
  minImpressions: number;
  minSessions: number;
};

export const DEFAULT_SETTINGS: EngineSettings = {
  enabled: true, collectionDays: 1, technicalDays: 7, analysisDays: 7,
  windowDays: 28, lagDays: 3, maxPages: 20, minImpressions: 50, minSessions: 30,
};

const bounds: Record<Exclude<keyof EngineSettings, "enabled">, [number, number]> = {
  collectionDays: [1, 90], technicalDays: [1, 90], analysisDays: [1, 90],
  windowDays: [7, 90], lagDays: [3, 14], maxPages: [1, 50],
  minImpressions: [10, 100000], minSessions: [10, 100000],
};

export function validateSettings(value: unknown): Partial<EngineSettings> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Configurazione non valida.");
  const result: Record<string, number | boolean> = {};
  for (const [key, v] of Object.entries(value)) {
    if (key === "enabled") {
      if (typeof v !== "boolean") throw new Error("enabled deve essere booleano.");
    } else {
      const range = bounds[key as keyof typeof bounds];
      if (!range || typeof v !== "number" || !Number.isInteger(v) || v < range[0] || v > range[1]) {
        throw new Error(`Valore non valido per ${key}.`);
      }
    }
    result[key] = v as number | boolean;
  }
  return result;
}

export function isDue(lastSuccess: Date | string | null, intervalDays: number, now = new Date()): boolean {
  if (lastSuccess === null) return true;
  const lastDay = Date.parse(new Date(lastSuccess).toISOString().slice(0, 10));
  const today = Date.parse(now.toISOString().slice(0, 10));
  return today - lastDay >= intervalDays * 86400000;
}

export function shiftDay(day: string, offset: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function analysisWindows(now: Date, days: number, lag: number) {
  const to = shiftDay(now.toISOString().slice(0, 10), -lag);
  const from = shiftDay(to, 1 - days);
  return { current: { from, to }, previous: { from: shiftDay(from, -days), to: shiftDay(from, -1) } };
}
