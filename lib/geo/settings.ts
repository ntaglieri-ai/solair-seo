import type { GeoFrequency } from "./store";

export type GeoSettingsInput = { enabled: boolean; frequency: GeoFrequency; monthlyBudgetMicrousd: number; scanBudgetMicrousd: number };
const FREQUENCIES = ["manual", "weekly", "biweekly", "monthly"] as const;
const MAX_MONTHLY_USD = 100;

/** Validazione del modulo impostazioni: importi in USD interi o con due decimali, convertiti in microdollari. */
export function parseGeoSettings(value: unknown): GeoSettingsInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Configurazione non valida.");
  const v = value as Record<string, unknown>;
  const keys = Object.keys(v);
  if (keys.some(key => !["enabled", "frequency", "monthlyBudgetUsd", "scanBudgetUsd"].includes(key))) throw new Error("Campo non previsto.");
  if (typeof v.enabled !== "boolean") throw new Error("enabled deve essere booleano.");
  if (!FREQUENCIES.includes(v.frequency as GeoFrequency)) throw new Error("Frequenza non valida.");
  const usd = (n: unknown, label: string) => {
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > MAX_MONTHLY_USD || Math.round(n * 100) !== n * 100 && Math.abs(Math.round(n * 100) - n * 100) > 1e-9)
      throw new Error(`Importo non valido per ${label}.`);
    return Math.round(n * 100) * 10_000;
  };
  const monthly = usd(v.monthlyBudgetUsd, "il budget mensile");
  const scan = usd(v.scanBudgetUsd, "il budget per scansione");
  if (scan > monthly) throw new Error("Il budget per scansione non può superare quello mensile.");
  return { enabled: v.enabled, frequency: v.frequency as GeoFrequency, monthlyBudgetMicrousd: monthly, scanBudgetMicrousd: scan };
}
