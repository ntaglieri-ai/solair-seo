/** Protocollo pilota: separato dalle quattro risposte senza web e dai report SEO. */
export const PILOT_VERSION = "solair-grounded-comparison-v1";
export const PILOT_BUDGET_USD = 5;
export const PILOT_SYSTEM = "Rispondi in italiano per una persona in Italia. Cerca informazioni aggiornate sul web e cita le fonti usate. Distingui fatti verificati, affermazioni dei siti e aspetti incerti. Non inventare aziende, copertura territoriale o fonti. Limita la risposta a circa 450 parole.";
export const PILOT_PROMPTS = [
  { id: "national", intent: "non-brand", text: "Quali aziende installano impianti fotovoltaici chiavi in mano in tutta Italia?" },
  { id: "home", intent: "non-brand", text: "Quali aziende valutare per un impianto fotovoltaico con accumulo per un’abitazione in Italia?" },
  { id: "business", intent: "non-brand", text: "Quali aziende offrono impianti fotovoltaici chiavi in mano per imprese in Italia?" },
  { id: "configurator", intent: "non-brand", text: "Quali configuratori online aiutano a valutare un impianto fotovoltaico in Italia?" },
  { id: "support", intent: "non-brand", text: "Quali installatori di fotovoltaico offrono assistenza e monitoraggio dopo l’installazione in Italia?" },
  { id: "cer", intent: "non-brand", text: "Quali aziende aiutano privati e imprese ad aderire a comunità energetiche rinnovabili in Italia?" },
  { id: "selection", intent: "non-brand", text: "Come confrontare installatori di fotovoltaico con copertura nazionale in Italia? Indica aziende e criteri da verificare." },
  { id: "roof", intent: "non-brand", text: "A quali aziende rivolgersi per valutare un impianto fotovoltaico sul tetto di una piccola impresa in Italia?" },
  { id: "brand-offer", intent: "brand", text: "Quali servizi offre Solair Group nel fotovoltaico e in quali aree d’Italia opera?" },
  { id: "brand-evidence", intent: "brand", text: "Quali informazioni pubbliche si possono verificare su Solair Group prima di richiedere un preventivo fotovoltaico?" },
] as const;
export type PilotEngine = "gemini" | "openai";
export const PILOT_MODELS: Record<PilotEngine, string> = { gemini: "gemini-3.5-flash-lite", openai: "gpt-5-mini" };
export type PilotCitation = { url: string; title: string; verification: "not_verified" | "reachable" | "unreachable" | "blocked";
  finalUrl?: string; httpStatus?: number | null; pageTitle?: string; excerpt?: string; checkedAt?: string };
export type PilotAnswer = {
  engine: PilotEngine; model: string; protocol: string; promptId: string; question: string;
  intent: "brand" | "non-brand"; collectedAt: string; answer: string; complete: boolean;
  mentioned: boolean | null; citations: PilotCitation[]; citedSolair: boolean;
  searches: number | null; inputTokens: number | null; outputTokens: number | null;
  estimatedUsd: number | null;
  reviewNotes?: { note: string; urls: string[]; checkedAt: string }[];
};

function safeCitation(url: unknown, title: unknown): PilotCitation | null {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.port ||
      !/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(parsed.hostname) || /(?:^|\.)(localhost|local|internal|test|invalid)$/.test(parsed.hostname)) return null;
    return { url: parsed.href, title: typeof title === "string" ? title : parsed.hostname, verification: "not_verified" };
  } catch { return null; }
}

/** Solo citazioni native: URL inventati nel testo o fonti solo recuperate non contano. */
export function googleCitations(metadata: unknown): PilotCitation[] {
  const value = metadata as { groundingChunks?: {web?: {uri?: unknown; title?: unknown}}[]; groundingSupports?: {groundingChunkIndices?: number[]}[] } | null;
  const used = new Set(value?.groundingSupports?.flatMap(support => support.groundingChunkIndices ?? []) ?? []);
  return uniqueCitations([...used].flatMap(index => {
    const chunk = value?.groundingChunks?.[index]?.web;
    const citation = safeCitation(chunk?.uri, chunk?.title);
    return citation ? [citation] : [];
  }));
}
export function openaiCitations(annotations: unknown): PilotCitation[] {
  if (!Array.isArray(annotations)) return [];
  return uniqueCitations(annotations.flatMap(annotation => {
    if (!annotation || annotation.type !== "url_citation") return [];
    const citation = safeCitation(annotation.url, annotation.title);
    return citation ? [citation] : [];
  }));
}
function uniqueCitations(citations: PilotCitation[]): PilotCitation[] {
  return [...new Map(citations.map(citation => [citation.url, citation])).values()];
}
export function citesSolair(citations: PilotCitation[]) {
  return citations.some(citation => {
    const host = new URL(citation.verification === "reachable" && citation.finalUrl ? citation.finalUrl : citation.url).hostname.toLowerCase();
    return host === "solairgroup.it" || host.endsWith(".solairgroup.it");
  });
}
/** Tariffe listino 2026-11-05: stima prudenziale senza franchigie, non fattura. */
export function estimatePilotUsd(engine: PilotEngine, input: number | null, output: number | null, searches: number | null): number | null {
  if ([input, output, searches].some(value => value === null || !Number.isFinite(value) || value! < 0)) return null;
  const prices = engine === "gemini" ? { input: .30, output: 2.50, search: .014 } : { input: .25, output: 2, search: .01 };
  return (input! * prices.input + output! * prices.output) / 1_000_000 + searches! * prices.search;
}
