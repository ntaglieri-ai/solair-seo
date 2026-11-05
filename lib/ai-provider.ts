import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { AI_MODEL, AI_SYSTEM, completedAiAnswer, failedAiAnswer, type AiError } from "./ai-checks";

export function aiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim()) && process.env.AI_FREE_TIER_CONFIRMED === "true";
}

/** Nessun tool di ricerca, fallback a pagamento, retry o dato privato nel prompt. */
export async function askAi(question: string, competitors: string[]) {
  const observedAt = new Date().toISOString();
  if (!aiConfigured()) return failedAiAnswer(question, "credentials", observedAt);
  try {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await generateText({
      model: google(AI_MODEL), system: AI_SYSTEM, prompt: question,
      maxOutputTokens: 2400, maxRetries: 0, abortSignal: AbortSignal.timeout(35000),
    });
    return completedAiAnswer(question, result.text, competitors, observedAt, result.finishReason);
  } catch (error) {
    // Gli errori SDK possono contenere richieste/credenziali: mai registrarli o salvarli.
    const status = typeof error === "object" && error !== null && "statusCode" in error ? error.statusCode : null;
    const name = error instanceof Error ? error.name : "";
    const code: AiError = status === 429 ? "quota" : status === 401 || status === 403 ? "credentials" :
      /Timeout|Abort/.test(name) ? "timeout" : "unavailable";
    return failedAiAnswer(question, code, observedAt);
  }
}
