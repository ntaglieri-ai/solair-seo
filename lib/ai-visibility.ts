/**
 * Visibilità nelle risposte AI: per ogni domanda e per ogni motore, se il
 * brand è citato, i concorrenti citati e le fonti. Per ora i dati arrivano
 * da un file JSON di esempio; la rilevazione reale userà la stessa forma.
 */

/** Nome con cui i dati raggruppano i concorrenti minori: sempre in fondo, mai "più citato". */
export const OTHER_COMPETITORS = "Altri installatori";

export type AiSource = {
  domain: string;
  /** Solair è presente su questo sito (scheda, recensioni, articolo). Non ancora mostrato. */
  solairOnSite?: boolean;
};

export type AiAnswer = {
  solairCited: boolean;
  /** Posizione del brand nella lista di aziende della risposta; null se non citato. */
  solairPosition: number | null;
  competitors: string[];
  /** Fonti citate nella risposta. */
  sources: AiSource[];
};

export type AiRun = {
  collectedAt: string;
  questions: { question: string; answers: Record<string, AiAnswer> }[];
};

export type AiVisibilityData = {
  sample: boolean;
  brand: string;
  engines: { id: string; name: string }[];
  /** Rilevazioni in ordine cronologico: l'ultima è la più recente. */
  runs: AiRun[];
};

export type CellState = "cited" | "competitors" | "none";

export type AiVisibilitySummary = {
  sample: boolean;
  brand: string;
  engines: { id: string; name: string }[];
  collectedAt: string;
  totalQuestions: number;
  /** Domande in cui il brand è citato da almeno un motore. */
  citedQuestions: number;
  /** Stesso conteggio nella rilevazione precedente, se c'è. */
  previousCitedQuestions: number | null;
  /** Media delle posizioni del brand nelle risposte che lo citano. */
  averagePosition: number | null;
  rows: { question: string; cells: { engine: string; state: CellState }[] }[];
  /** Aziende per numero di domande in cui compaiono, brand incluso; "Altri installatori" in fondo. */
  companies: { name: string; questions: number; isBrand: boolean }[];
  /** Concorrente con più domande, esclusi il brand e "Altri installatori". */
  topCompetitor: { name: string; questions: number } | null;
  /** Domini più citati, con il numero di risposte che li citano. */
  sources: { domain: string; answers: number; solairOnSite?: boolean }[];
};

function cellState(answer: AiAnswer | undefined): CellState {
  if (answer?.solairCited) return "cited";
  if (answer && answer.competitors.length > 0) return "competitors";
  return "none";
}

function countCitedQuestions(run: AiRun): number {
  return run.questions.filter((q) => Object.values(q.answers).some((a) => a.solairCited)).length;
}

export function summarizeAiVisibility(data: AiVisibilityData, topSources = 5): AiVisibilitySummary | null {
  const run = data.runs.at(-1);
  if (!run) return null;
  const previous = data.runs.at(-2) ?? null;

  const positions: number[] = [];
  const companyQuestions = new Map<string, number>();
  const sources = new Map<string, { answers: number; solairOnSite?: boolean }>();

  for (const q of run.questions) {
    const answers = Object.values(q.answers);
    const names = new Set(answers.flatMap((a) => a.competitors));
    if (answers.some((a) => a.solairCited)) names.add(data.brand);
    for (const name of names) companyQuestions.set(name, (companyQuestions.get(name) ?? 0) + 1);

    for (const answer of answers) {
      if (answer.solairCited && answer.solairPosition !== null) positions.push(answer.solairPosition);
      const seen = new Set<string>();
      for (const source of answer.sources) {
        if (seen.has(source.domain)) continue;
        seen.add(source.domain);
        const entry = sources.get(source.domain) ?? { answers: 0 };
        entry.answers += 1;
        if (source.solairOnSite !== undefined) entry.solairOnSite = entry.solairOnSite || source.solairOnSite;
        sources.set(source.domain, entry);
      }
    }
  }

  const companies = [...companyQuestions]
    .map(([name, questions]) => ({ name, questions, isBrand: name === data.brand }))
    .sort(
      (a, b) =>
        Number(a.name === OTHER_COMPETITORS) - Number(b.name === OTHER_COMPETITORS) ||
        b.questions - a.questions ||
        a.name.localeCompare(b.name)
    );
  const top = companies.find((c) => !c.isBrand && c.name !== OTHER_COMPETITORS);

  return {
    sample: data.sample,
    brand: data.brand,
    engines: data.engines,
    collectedAt: run.collectedAt,
    totalQuestions: run.questions.length,
    citedQuestions: countCitedQuestions(run),
    previousCitedQuestions: previous ? countCitedQuestions(previous) : null,
    averagePosition: positions.length ? positions.reduce((sum, p) => sum + p, 0) / positions.length : null,
    rows: run.questions.map((q) => ({
      question: q.question,
      cells: data.engines.map((engine) => ({ engine: engine.id, state: cellState(q.answers[engine.id]) })),
    })),
    companies,
    topCompetitor: top ? { name: top.name, questions: top.questions } : null,
    sources: [...sources]
      .map(([domain, entry]) => ({ domain, ...entry }))
      .sort((a, b) => b.answers - a.answers || a.domain.localeCompare(b.domain))
      .slice(0, topSources),
  };
}
