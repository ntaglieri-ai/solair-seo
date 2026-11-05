import "server-only";
import { createGoogleGenerativeAI, type GoogleProviderMetadata } from "@ai-sdk/google";
import { generateText } from "ai";
import { PILOT_MODELS, PILOT_SYSTEM, googleCitations } from "../protocol";

/** Adapter non collegato a cron o route pubbliche: riservato al pilota autorizzato. */
export async function askGeminiWithSearch(question: string) {
  if (process.env.GEO_PAID_PILOT_ENABLED !== "true" || !process.env.GEMINI_API_KEY) throw new Error("Pilota a pagamento non attivo.");
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
    searches: grounding?.webSearchQueries ? new Set(grounding.webSearchQueries.filter(Boolean)).size : null,
    inputTokens: result.usage.inputTokens ?? null, outputTokens: result.usage.outputTokens ?? null,
  };
}
