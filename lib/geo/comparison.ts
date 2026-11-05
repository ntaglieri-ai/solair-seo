import type { GeoAnswer } from "./answer";

/** Confronti solo su campioni completi con stesse domande, modello e protocollo. */
export function comparableAnswers(current: GeoAnswer[], previous: GeoAnswer[], planned: number) {
  const valid = (answers: GeoAnswer[]) => answers.length === planned && answers.every(a => a.complete) &&
    new Set(answers.map(a => a.promptId)).size === planned;
  if (!valid(current) || !valid(previous)) return false;
  const fingerprint = (answers: GeoAnswer[]) => JSON.stringify(answers.map(a =>
    [a.promptId, a.question, a.intent, a.engine, a.model, a.protocol]).sort((a, b) => a[0].localeCompare(b[0])));
  return fingerprint(current) === fingerprint(previous);
}

export const SCAN_STATES = { running: "Analisi in corso", done: "Analisi completa", partial: "Risultati parziali", failed: "Analisi interrotta" } as const;
export const STOP_MESSAGES: Record<string, string> = {
  period_budget: "Raggiunta la soglia mensile: le risposte già raccolte sono conservate.",
  scan_budget: "Raggiunta la soglia di questa analisi: le domande restanti non sono state misurate.",
  provider_error: "Il motore non ha completato alcune richieste. I risultati disponibili sono conservati.",
  disabled: "La raccolta è stata disattivata durante l’analisi. Le risposte già ricevute sono conservate.",
  invalid: "Le preferenze sono cambiate durante l’analisi: il campione è stato fermato per mantenerlo coerente.",
  time: "L’analisi prosegue dal punto raggiunto, senza ripetere le richieste già inviate.",
};
