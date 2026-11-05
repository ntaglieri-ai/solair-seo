import type { Opportunity, Period } from "../engine/analyze";
import type { GeoAnswer } from "./answer";

export type GeoSeoContext = { snapshotId: string; capturedAt: string; windows: { current: Period; previous: Period } | null; opportunities: Opportunity[] };
const THEMES: Record<string, RegExp> = {
  configurator: /configurator|preventiv/i, cer: /comunit[aà]|energetich|\bcer\b/i,
  support: /assistenz|monitoragg|manutenz/i, business: /imprese|aziend|industrial/i,
  roof: /imprese|aziend|tett/i, home: /abitazion|residenzial|accumulo/i,
  national: /italia|nazional/i, selection: /confront|garanzi|certificaz/i,
};

/** Affinità di tema, non attribuzione causale: nessun LLM inventa una correlazione. */
export function relatedGeoGaps(opportunity: Opportunity, answers: GeoAnswer[]) {
  const text = `${opportunity.page} ${opportunity.query ?? ""} ${opportunity.title}`;
  return answers.filter(a => a.complete && a.intent === "non-brand" && a.mentioned === false && !a.citedSolair &&
    a.citations.every(c => c.verification === "reachable") && THEMES[a.promptId]?.test(text)).map(a => a.question);
}
