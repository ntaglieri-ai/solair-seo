import "server-only";
import { createGoogleGenerativeAI, type GoogleProviderMetadata } from "@ai-sdk/google";
import { generateText } from "ai";
import { PILOT_MODELS, PILOT_SYSTEM, googleCitations } from "../protocol";

/** Consumi a pagamento: attivi solo con GEO_PAID_PILOT_ENABLED (pilota) o GEO_LEVEL2_ENABLED (scansioni livello 2). */
export async function askGeminiWithSearch(question: string) {
  if ((process.env.GEO_PAID_PILOT_ENABLED !== "true" && process.env.GEO_LEVEL2_ENABLED !== "true") || !process.env.GEMINI_API_KEY) throw new Error("Consumi a pagamento non attivi.");
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  const result = await generateText({
    model: google(PILOT_MODELS.gemini), system: PILOT_SYSTEM, prompt: question,
    tools: { google_search: google.tools.googleSearch({}) },
    maxOutputTokens: 2400, maxRetries: 0, abortSignal: AbortSignal.timeout(60000),
  });
  const grounding = (result.providerMetadata?.google as GoogleProviderMetadata | undefined)?.groundingMetadata;
  return {
    text: result.text, finishReason: result.finishReason,
    actualModel: result.response.modelId,
    citations: googleCitations(grounding),
    searchQueries: grounding?.webSearchQueries?.filter(query => query.trim()) ?? [],
    searches: grounding?.webSearchQueries ? grounding.webSearchQueries.filter(query => query.trim()).length : null,
    inputTokens: result.usage.inputTokens ?? null, outputTokens: result.usage.outputTokens ?? null,
  };
}
