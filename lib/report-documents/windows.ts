/** Finestre temporali dei tre tipi di report. Funzioni pure: le date arrivano dall'archivio, mai dall'orologio. */
export type ReportKind = "startup" | "monthly" | "update";
export type Window = { from: string; to: string };
export const MIN_UPDATE_DAYS = 3;
export const STARTUP_DAYS = 28;

export const shiftDay = (day: string, offset: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
export const daysIn = (w: Window) => Math.round((Date.parse(`${w.to}T12:00:00Z`) - Date.parse(`${w.from}T12:00:00Z`)) / 86_400_000) + 1;
/** Cadenza di default se le impostazioni non sono ancora state lette (non dovrebbe succedere). */
const DEFAULT_PERIODIC_DAYS = 30;

export type WindowError = "NO_DATA" | "NEEDS_STARTUP" | "TOO_FEW_DAYS";
export type Resolved = { ok: true; current: Window; compare: Window | null } | { ok: false; error: WindowError; detail?: string };

/**
 * startup: 28 giorni conclusi all'ultimo dato, nessun confronto (è il punto di partenza).
 * monthly: ultimi `periodicDays` giorni conclusi all'ultimo dato, confrontati con i `periodicDays`
 * precedenti. `periodicDays` segue la cadenza impostata dal cliente (seo.engine_settings.analysis_days),
 * non più un mese di calendario fisso: un report ogni 90 giorni deve coprire 90 giorni, non 30.
 * update: nuovi giorni disponibili; confronto con un intervallo precedente di pari durata da tre giorni in poi.
 */
export function resolveWindow(input: { kind: ReportKind; lastDate: string | null; previousEnd: string | null; periodicDays?: number }): Resolved {
  const { kind, lastDate, previousEnd, periodicDays } = input;
  if (!lastDate) return { ok: false, error: "NO_DATA" };
  if (kind === "startup") return { ok: true, current: { from: shiftDay(lastDate, 1 - STARTUP_DAYS), to: lastDate }, compare: null };
  if (kind === "monthly") {
    const days = periodicDays && periodicDays > 0 ? periodicDays : DEFAULT_PERIODIC_DAYS;
    const current = { from: shiftDay(lastDate, 1 - days), to: lastDate };
    const compare = { from: shiftDay(current.from, -days), to: shiftDay(current.from, -1) };
    return { ok: true, current, compare };
  }
  if (!previousEnd) return { ok: false, error: "NEEDS_STARTUP" };
  const current = { from: previousEnd >= lastDate ? lastDate : shiftDay(previousEnd, 1), to: lastDate };
  const days = daysIn(current);
  return { ok: true, current, compare: days >= MIN_UPDATE_DAYS ? { from: shiftDay(current.from, -days), to: shiftDay(current.from, -1) } : null };
}

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
export const monthLabel = (day: string) => `${MONTHS[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;

/** Nome del file scaricato: leggibile per il cliente, senza codici interni. `nth` distingue più documenti identici. */
export function documentFileName(kind: ReportKind, createdAt: Date, period: Window | null, nth = 1) {
  const suffix = nth > 1 ? `-${nth}` : "";
  if (kind === "monthly" && period) return `Solair-Report-Periodico-${period.from}_${period.to}${suffix}.pdf`;
  if (kind === "startup") return `Solair-Report-Startup-${createdAt.toISOString().slice(0, 10)}${suffix}.pdf`;
  if (period) return `Solair-Aggiornamento-${period.from}_${period.to}${suffix}.pdf`;
  return `Solair-Aggiornamento-${createdAt.toISOString().slice(0, 10)}${suffix}.pdf`;
}
export const KIND_LABEL: Record<ReportKind, string> = { startup: "Start-up", monthly: "Periodico", update: "Aggiornamento" };
