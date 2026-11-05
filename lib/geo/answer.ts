import { citesSolair, estimatePilotUsd, type PilotAnswer, type PilotCitation, type PilotEngine } from "../geo-pilot/protocol";
import { hasName } from "../ai-checks";
import type { GeoPrompt } from "./prompts";

export type GeoAnswer = PilotAnswer & { competitorsMentioned: string[]; searchQueries?: string[] };

export type RawAnswer = {
  text: string; finishReason: string; actualModel: string; citations: PilotCitation[];
  searchQueries?: string[]; searches: number | null; inputTokens: number | null; outputTokens: number | null;
};

/** Rilevamento deterministico: nessun LLM decide se Solair è presente. */
export function buildGeoAnswer(engine: PilotEngine, prompt: GeoPrompt, raw: RawAnswer, protocol: string, competitors: string[], collectedAt = new Date().toISOString()): GeoAnswer {
  const complete = raw.finishReason === "stop" && raw.text.trim().length >= 30 && raw.searches !== null && raw.searches > 0;
  return {
    engine, model: raw.actualModel, protocol, promptId: prompt.id, question: prompt.text, intent: prompt.intent, collectedAt,
    answer: raw.text, complete,
    mentioned: complete ? hasName(raw.text, "Solair") || /solairgroup\.it/i.test(raw.text) : null,
    citations: raw.citations, citedSolair: citesSolair(raw.citations),
    searchQueries: raw.searchQueries ?? [], searches: raw.searches, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens,
    estimatedUsd: estimatePilotUsd(engine, raw.inputTokens, raw.outputTokens, raw.searches),
    competitorsMentioned: complete ? competitors.filter(name => hasName(raw.text, name)) : [],
  };
}

/** Dopo la verifica delle fonti i redirect Google puntano al dominio reale: ricalcola la citazione di Solair. */
export function withVerifiedCitations(answer: GeoAnswer, verified: Map<string, Partial<PilotCitation>>): GeoAnswer {
  const citations = answer.citations.map(citation => ({ ...citation, ...(verified.get(citation.url) ?? {}) }));
  return { ...answer, citations, citedSolair: citesSolair(citations) };
}

export function pendingVerification(answers: GeoAnswer[]): string[] {
  return [...new Set(answers.flatMap(a => a.citations.filter(c => c.verification === "not_verified").map(c => c.url)))];
}

/** Classificazione stretta: gli errori degli SDK possono contenere richieste o credenziali. */
export function errorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "statusCode" in error ? `provider_http_${String(error.statusCode).slice(0, 3)}` : "provider_or_timeout";
}
