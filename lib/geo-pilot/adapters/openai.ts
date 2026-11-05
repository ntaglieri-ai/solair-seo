import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { PILOT_MODELS, PILOT_SYSTEM, openaiCitations } from "../protocol";

/** Stessa domanda e istruzioni di Gemini. Nessun dato GSC/GA4 nel prompt. */
export async function askOpenaiWithSearch(question: string) {
  if (process.env.GEO_PAID_PILOT_ENABLED !== "true" || !process.env.OPENAI_API_KEY) throw new Error("Pilota a pagamento non attivo.");
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const result = await generateText({
    model: openai.responses(PILOT_MODELS.openai), system: PILOT_SYSTEM, prompt: question,
    tools: { web_search: openai.tools.webSearch({ searchContextSize: "low", userLocation: { type: "approximate", country: "IT" } }) },
    toolChoice: { type: "tool", toolName: "web_search" },
    providerOptions: { openai: { store: false, maxToolCalls: 1, reasoningEffort: "low", reasoningSummary: null } },
    maxOutputTokens: 2400, maxRetries: 0, abortSignal: AbortSignal.timeout(60000),
  });
  const annotations = result.content.flatMap(part => part.type === "text" && Array.isArray(part.providerMetadata?.openai?.annotations) ? part.providerMetadata.openai.annotations : []);
  return {
    text: result.text, finishReason: result.finishReason,
    citations: openaiCitations(annotations),
    searches: result.toolCalls.filter(call => call.toolName === "web_search").length,
    inputTokens: result.usage.inputTokens ?? null, outputTokens: result.usage.outputTokens ?? null,
  };
}
