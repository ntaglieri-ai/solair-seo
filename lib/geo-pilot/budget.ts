export const PILOT_BUDGET_ID = "solair-grounded-pilot-2026-11";
export const BUDGET_MICROUSD = 5_000_000;
// Riserva prudenziale per singola richiesta, non prezzo massimo del provider.
export const REQUEST_RESERVE_MICROUSD = 250_000;
// Lascia margine per la richiesta in corso: non usare il saldo come cutoff istantaneo.
export const RUN_STOP_MICROUSD = 4_000_000;
export function canReserve(accounted: number, reserved: number, limit = BUDGET_MICROUSD) {
  return Number.isSafeInteger(accounted) && Number.isSafeInteger(reserved) && accounted >= 0 && reserved > 0 && accounted + reserved <= Math.min(limit, RUN_STOP_MICROUSD);
}
export function accountedCost(estimatedUsd: number | null, reserve: number) {
  return estimatedUsd === null || !Number.isFinite(estimatedUsd) || estimatedUsd < 0 ? reserve : Math.ceil(estimatedUsd * 1_000_000);
}
