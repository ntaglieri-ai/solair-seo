/** Finestre temporali dei tre tipi di report. Funzioni pure: le date arrivano dall'archivio, mai dall'orologio. */
export type ReportKind = "startup" | "monthly" | "update";
export type Window = { from: string; to: string };
export const MIN_UPDATE_DAYS = 3;
export const STARTUP_DAYS = 28;

export const shiftDay = (day: string, offset: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
export const daysIn = (w: Window) => Math.round((Date.parse(`${w.to}T12:00:00Z`) - Date.parse(`${w.from}T12:00:00Z`)) / 86_400_000) + 1;
const monthEnd = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0, 12)).toISOString().slice(0, 10);
const monthWindow = (year: number, month: number): Window => ({ from: new Date(Date.UTC(year, month, 1, 12)).toISOString().slice(0, 10), to: monthEnd(year, month) });

/** Ultimo mese di calendario concluso entro `lastDate` (l'ultimo giorno con dati archiviati). */
export function lastCompleteMonth(lastDate: string): Window {
  const d = new Date(`${lastDate}T12:00:00Z`), y = d.getUTCFullYear(), m = d.getUTCMonth();
  return monthEnd(y, m) === lastDate ? monthWindow(y, m) : m === 0 ? monthWindow(y - 1, 11) : monthWindow(y, m - 1);
}
export function previousMonth(w: Window): Window {
  const d = new Date(`${w.from}T12:00:00Z`), y = d.getUTCFullYear(), m = d.getUTCMonth();
  return m === 0 ? monthWindow(y - 1, 11) : monthWindow(y, m - 1);
}
export type WindowError = "NO_DATA" | "NEEDS_STARTUP" | "TOO_FEW_DAYS";
export type Resolved = { ok: true; current: Window; compare: Window | null } | { ok: false; error: WindowError; detail?: string };

/**
 * startup: 28 giorni conclusi all'ultimo dato, nessun confronto (è il punto di partenza).
 * monthly: ultimo mese concluso, confrontato col mese precedente.
 * update: dal giorno dopo la fine del documento precedente all'ultimo dato, nessun confronto.
 */
export function resolveWindow(input: { kind: ReportKind; lastDate: string | null; previousEnd: string | null }): Resolved {
  const { kind, lastDate, previousEnd } = input;
  if (!lastDate) return { ok: false, error: "NO_DATA" };
  if (kind === "startup") return { ok: true, current: { from: shiftDay(lastDate, 1 - STARTUP_DAYS), to: lastDate }, compare: null };
  if (kind === "monthly") { const current = lastCompleteMonth(lastDate); return { ok: true, current, compare: previousMonth(current) }; }
  if (!previousEnd) return { ok: false, error: "NEEDS_STARTUP" };
  const current = { from: shiftDay(previousEnd, 1), to: lastDate };
  const days = daysIn(current);
  return days >= MIN_UPDATE_DAYS ? { ok: true, current, compare: null } : { ok: false, error: "TOO_FEW_DAYS", detail: `${Math.max(days, 0)}` };
}

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
export const monthLabel = (day: string) => `${MONTHS[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;

/** Nome del file scaricato: leggibile per il cliente, senza codici interni. `nth` distingue più documenti identici. */
export function documentFileName(kind: ReportKind, createdAt: Date, period: Window | null, nth = 1) {
  const suffix = nth > 1 ? `-${nth}` : "";
  if (kind === "monthly" && period) return `Solair-Report-Mensile-${period.to.slice(0, 7)}${suffix}.pdf`;
  if (kind === "startup") return `Solair-Report-Startup-${createdAt.toISOString().slice(0, 10)}${suffix}.pdf`;
  if (period) return `Solair-Aggiornamento-${period.from}_${period.to}${suffix}.pdf`;
  return `Solair-Aggiornamento-${createdAt.toISOString().slice(0, 10)}${suffix}.pdf`;
}
export const KIND_LABEL: Record<ReportKind, string> = { startup: "Start-up", monthly: "Mensile", update: "Aggiornamento" };
