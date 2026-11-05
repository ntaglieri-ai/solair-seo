/** Protocollo pubblico e ripetibile: nessun dato GSC/GA4 entra nelle domande. */
export const AI_MODEL = "gemini-3.5-flash-lite";
export const AI_PROTOCOL = "solair-api-no-web-v1";
export const AI_SYSTEM = "Rispondi in italiano. Distingui informazioni note da elementi da verificare. Non inventare aziende, dati o fonti. Non hai accesso alla ricerca web in questa prova.";
export const AI_ERRORS = {
  quota: "Limite gratuito raggiunto. Riprova dopo il ripristino della quota Google.",
  credentials: "Accesso Gemini da verificare nelle impostazioni del servizio.",
  timeout: "Il motore non ha risposto entro il tempo disponibile.",
  incomplete: "Risposta vuota, interrotta o non completata: verifica non misurabile.",
  unavailable: "Il motore AI non è disponibile. Le verifiche precedenti restano consultabili.",
} as const;
export type AiError = keyof typeof AI_ERRORS;
export type AiCheckResult = {
  question: string;
  observedAt: string;
  status: "ok" | "error";
  answer: string;
  mentionsBrand: boolean | null;
  mentionedCompetitors: string[];
  error: AiError | null;
};
export type AiCheckBatch = {
  id: string;
  model: string;
  protocol: string;
  status: "running" | "complete" | "partial" | "failed";
  trigger: "manual" | "cron";
  results: AiCheckResult[];
  questions: string[];
  createdAt: Date;
  finishedAt: Date | null;
};
export function hasName(text: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu").test(text);
}
export function completedAiAnswer(question: string, answer: string, competitors: string[], observedAt: string, finishReason: string): AiCheckResult {
  if (finishReason !== "stop" || answer.trim().length < 30 || answer.length > 24000) {
    return failedAiAnswer(question, "incomplete", observedAt);
  }
  return { question, observedAt, status: "ok", answer: answer.trim(),
    mentionsBrand: hasName(answer, "Solair") || /solairgroup\.it/i.test(answer),
    mentionedCompetitors: competitors.filter(name => hasName(answer, name)), error: null };
}
export function failedAiAnswer(question: string, error: AiError, observedAt: string): AiCheckResult {
  return { question, observedAt, status: "error", answer: "", mentionsBrand: null, mentionedCompetitors: [], error };
}
export function aiSample(batch: AiCheckBatch) {
  const valid = batch.results.filter(result => result.status === "ok");
  return { expected: batch.questions.length, measured: valid.length, mentioned: valid.filter(result => result.mentionsBrand).length };
}
export function comparableAiBatch(current: AiCheckBatch, previous: AiCheckBatch): boolean {
  return current.status === "complete" && previous.status === "complete" &&
    current.model === previous.model && current.protocol === previous.protocol &&
    JSON.stringify(current.questions) === JSON.stringify(previous.questions);
}
