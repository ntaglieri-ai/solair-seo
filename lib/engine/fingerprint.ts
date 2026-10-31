import { createHash } from "node:crypto";
import type { Evidence, TechnicalEvidence, analyzeEvidence } from "./analyze";
import type { EngineSettings } from "./settings";

export function analysisFingerprint(input: {
  settings: EngineSettings;
  evidence: Evidence | null;
  technical: TechnicalEvidence | null;
  analysis: ReturnType<typeof analyzeEvidence>;
  errors: string[];
  day: string;
}) {
  // La freschezza può cambiare il risultato anche quando i dati non cambiano.
  return createHash("sha256").update(JSON.stringify({
    version: input.analysis.version,
    settings: Object.entries(input.settings).sort(),
    evidence: input.evidence ? { ...input.evidence, collectedAt: undefined } : null,
    technical: input.technical,
    analysis: input.analysis,
    errors: [...input.errors].sort(),
    blockedOn: input.analysis.status === "blocked" ? input.day : undefined,
  })).digest("hex");
}
