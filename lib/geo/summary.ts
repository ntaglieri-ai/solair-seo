import type { GeoAnswer } from "./answer";

const OWN = "solairgroup.it";
const GOOGLE_REDIRECT = /(^|\.)vertexaisearch\.cloud\.google\.com$/;

export type GeoSummary = {
  planned: number; complete: number;
  nonBrandComplete: number; nonBrandMentioned: number; nonBrandOwnCitations: number;
  brandComplete: number; brandMentioned: number;
  competitors: { name: string; prompts: number }[];
};

/** Le domande col nome Solair misurano l'accuratezza sul brand: non si sommano alla scoperta spontanea. */
export function summarizeScan(answers: GeoAnswer[], planned: number): GeoSummary {
  const complete = answers.filter(a => a.complete);
  const nonBrand = complete.filter(a => a.intent === "non-brand");
  const brand = complete.filter(a => a.intent === "brand");
  const tally = new Map<string, number>();
  for (const a of nonBrand) for (const name of new Set(a.competitorsMentioned ?? [])) tally.set(name, (tally.get(name) ?? 0) + 1);
  return {
    planned, complete: complete.length,
    nonBrandComplete: nonBrand.length, nonBrandMentioned: nonBrand.filter(a => a.mentioned).length,
    nonBrandOwnCitations: nonBrand.filter(a => a.citedSolair).length,
    brandComplete: brand.length, brandMentioned: brand.filter(a => a.mentioned).length,
    competitors: [...tally].map(([name, prompts]) => ({ name, prompts })).sort((a, b) => b.prompts - a.prompts || a.name.localeCompare(b.name)),
  };
}

/** Dominio di una citazione solo se la destinazione è stata verificata: i redirect Google non verificati non si attribuiscono. */
export function citationHost(citation: GeoAnswer["citations"][number]): string | null {
  if (citation.verification !== "reachable" || !citation.finalUrl) return null;
  try {
    const host = new URL(citation.finalUrl).hostname.toLowerCase().replace(/^www\./, "");
    return GOOGLE_REDIRECT.test(host) ? null : host;
  } catch { return null; }
}

export type Opportunity = {
  kind: "prompt_gap" | "source_domain";
  title: string;
  /** Sempre "da verificare": un'assenza o una fonte citata non bastano a motivare da sole un intervento. */
  status: "da_verificare";
  evidence: string[];
  checks: string[];
};

const SOURCE_CHECKS = [
  "La pagina citata tratta davvero il tema delle domande in cui Solair è assente.",
  "La fonte accetta schede, recensioni o contributi, oppure è un contenuto editoriale aperto a nuovi soggetti.",
  "Un contenuto di Solair su quel tema sarebbe coerente con ciò che il sito pubblica e verificabile.",
  "La fonte sostiene l'affermazione per cui è citata (la raggiungibilità del link non lo dimostra).",
];
const GAP_CHECKS = [
  "Il sito di Solair ha una pagina che risponde in modo diretto a questa domanda.",
  "Le aziende presenti nella risposta offrono qualcosa di verificabile che Solair non comunica.",
  "La risposta può cambiare da una raccolta all'altra: confrontala con la scansione successiva prima di intervenire.",
];

/** Opportunità da verificare, ricavate dai dati. Nessuna è un intervento già motivato. */
export function suggestOpportunities(answers: GeoAnswer[], minPrompts = 2): Opportunity[] {
  const gaps = answers.filter(a => a.complete && a.intent === "non-brand" && !a.mentioned && !a.citedSolair && !a.citations.some(c => c.verification === "not_verified" || (GOOGLE_REDIRECT.test(new URL(c.url).hostname) && !citationHost(c))));
  const out: Opportunity[] = gaps.map(a => ({
    kind: "prompt_gap" as const,
    title: `Solair assente nella risposta a: «${a.question}»`,
    status: "da_verificare" as const,
    evidence: [a.competitorsMentioned?.length ? `Aziende seguite presenti: ${a.competitorsMentioned.join(", ")}.` : "Nessuna azienda seguita nella risposta.",
      `${a.citations.length} fonti citate dal motore.`],
    checks: GAP_CHECKS,
  }));
  const byHost = new Map<string, Set<string>>();
  for (const a of gaps) for (const c of a.citations) {
    const host = citationHost(c);
    if (!host || host === OWN || host.endsWith(`.${OWN}`)) continue;
    byHost.set(host, (byHost.get(host) ?? new Set()).add(a.promptId));
  }
  const sources = [...byHost].filter(([, prompts]) => prompts.size >= minPrompts)
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0])).slice(0, 5)
    .map(([host, prompts]): Opportunity => ({
      kind: "source_domain", title: `${host} è citato in ${prompts.size} risposte in cui Solair è assente`, status: "da_verificare",
      evidence: [`Prompt: ${[...prompts].join(", ")}.`], checks: SOURCE_CHECKS,
    }));
  return [...sources, ...out];
}
