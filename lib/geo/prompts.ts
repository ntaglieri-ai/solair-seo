import { PILOT_PROMPTS, PILOT_SYSTEM, PILOT_VERSION } from "../geo-pilot/protocol";

export type GeoPrompt = { id: string; intent: "brand" | "non-brand"; text: string };

// Un set di prompt è immutabile: cambiare le domande significa nuova versione,
// altrimenti il confronto con le scansioni precedenti non è valido.
import { GEO_V2_PROMPTS, GEO_V2_SYSTEM, GEO_V2_VERSION } from "./prompts-v2";
const SETS: Record<string, { system: string; prompts: readonly GeoPrompt[] }> = {
  [PILOT_VERSION]: { system: PILOT_SYSTEM, prompts: PILOT_PROMPTS },
  [GEO_V2_VERSION]: { system: GEO_V2_SYSTEM, prompts: GEO_V2_PROMPTS },
};

/** Set usato per le nuove rilevazioni (Start-up e successive). */
export const CURRENT_PROMPT_SET = GEO_V2_VERSION;
/** Costo indicativo per domanda con ricerca web (USD), usato solo per la stima prima di lanciare. */
export const EST_USD_PER_PROMPT = 0.03;
export function getPromptSet(version: string) {
  const set = SETS[version];
  if (!set) throw new Error(`Set di prompt sconosciuto: ${version}`);
  return set;
}

/** Nome della misura mostrato nei report: non replica l'app consumer. */
export const MEASURE_NAME = "Presenza nelle risposte Gemini tramite API con ricerca web";
export const MEASURE_NAMES = {
  gemini: MEASURE_NAME,
  openai: "Presenza nelle risposte OpenAI tramite API con ricerca web",
} as const;
