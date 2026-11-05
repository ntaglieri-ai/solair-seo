import { PILOT_PROMPTS, PILOT_SYSTEM, PILOT_VERSION } from "../geo-pilot/protocol";

export type GeoPrompt = { id: string; intent: "brand" | "non-brand"; text: string };

// Un set di prompt è immutabile: cambiare le domande significa nuova versione,
// altrimenti il confronto con le scansioni precedenti non è valido.
const SETS: Record<string, { system: string; prompts: readonly GeoPrompt[] }> = {
  [PILOT_VERSION]: { system: PILOT_SYSTEM, prompts: PILOT_PROMPTS },
};

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
