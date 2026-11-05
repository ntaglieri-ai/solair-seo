// Regole di budget del livello 2: pure, senza database, così sono testabili.
// Il tetto è applicativo: non può annullare un costo già in corso presso il fornitore.

export const STOP_RATIO = 0.8;

export type BudgetState = {
  /** Costo contabilizzato nel periodo (richieste chiuse + riserve ancora aperte). */
  periodAccounted: number;
  periodLimit: number;
  /** Costo contabilizzato nella scansione corrente. */
  scanAccounted: number;
  scanLimit: number;
};

export type ReserveDecision =
  | { ok: true }
  | { ok: false; reason: "period_budget" | "scan_budget" | "invalid" };

const isMicro = (value: number) => Number.isSafeInteger(value) && value >= 0;

/** Soglia oltre la quale non si avviano nuove richieste (margine per quella in corso). */
export function stopThreshold(limit: number): number {
  return Math.floor(limit * STOP_RATIO);
}

/** Prima di ogni chiamata: la riserva deve entrare sia nel budget del periodo sia in quello della scansione. */
export function canReserve(state: BudgetState, reserve: number): ReserveDecision {
  const values = [state.periodAccounted, state.periodLimit, state.scanAccounted, state.scanLimit];
  if (!values.every(isMicro) || !Number.isSafeInteger(reserve) || reserve <= 0) return { ok: false, reason: "invalid" };
  if (state.periodAccounted + reserve > stopThreshold(state.periodLimit)) return { ok: false, reason: "period_budget" };
  if (state.scanAccounted + reserve > stopThreshold(state.scanLimit)) return { ok: false, reason: "scan_budget" };
  return { ok: true };
}

/** Costo da contabilizzare a risposta ricevuta: stima arrotondata per eccesso, o l'intera riserva se ignoto. */
export function accountedCost(estimatedUsd: number | null, reserve: number): number {
  return estimatedUsd === null || !Number.isFinite(estimatedUsd) || estimatedUsd < 0
    ? reserve
    : Math.ceil(estimatedUsd * 1_000_000);
}

/** Id del budget mensile per un sito: un solo budget per mese di calendario (UTC). */
export function budgetPeriod(site: string, at: Date) {
  const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
  const end = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0));
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return { id: `${site}:${iso(start).slice(0, 7)}`, start: iso(start), end: iso(end) };
}
