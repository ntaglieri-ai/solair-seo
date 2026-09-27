/** Formattazione italiana condivisa dalle pagine. */

const TIME_ZONE = "Europe/Rome";

const integer = new Intl.NumberFormat("it-IT");
const decimal = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("it-IT", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatInt = (value: number) => integer.format(value);
export const formatDecimal = (value: number) => decimal.format(value);
/** `value` come frazione: 0.1016 → "10,2%". */
export const formatPercent = (value: number) => percent.format(value);

/** "2026-09-25" o Date → "25 settembre 2026". */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00Z`) : value;
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE });
}

/** "2026-10-05" o Date → "5 ottobre". */
export function formatDayMonth(value: string | Date): string {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00Z`) : value;
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "long", timeZone: TIME_ZONE });
}

/** "2026-09-25" o Date → "25 set". */
export function formatShortDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00Z`) : value;
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "short", timeZone: TIME_ZONE });
}

/** Date → "26 settembre 2026, 13:54". */
export function formatDateTime(value: Date): string {
  return value.toLocaleString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
}

/**
 * Variazione tra due valori come testo con segno: "+166%", "−12%".
 * Per la posizione media (più bassa è meglio) passare `lowerIsBetter`.
 */
export function formatDelta(
  current: number,
  previous: number,
  { lowerIsBetter = false }: { lowerIsBetter?: boolean } = {}
): { text: string; trend: "up" | "down" | "flat" } | null {
  if (!previous) return null;
  const change = (current - previous) / previous;
  if (Math.abs(change) < 0.005) return { text: "invariato", trend: "flat" };
  const sign = change > 0 ? "+" : "−";
  const improved = lowerIsBetter ? change < 0 : change > 0;
  return {
    text: `${sign}${integer.format(Math.round(Math.abs(change) * 100))}%`,
    trend: improved ? "up" : "down",
  };
}

/** URL di pagina senza dominio: "https://solairgroup.it/faq" → "/faq". */
export function shortPath(url: string): string {
  try {
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}` || "/";
    return parsed.protocol === "http:" ? `${path} (http)` : path;
  } catch {
    return url;
  }
}
