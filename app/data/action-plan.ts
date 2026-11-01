import type { Opportunity } from "../../lib/engine/analyze";

export type ActionPlan = {
  actions: Opportunity[];
  period: { from: string; to: string } | null;
  validatedAt: Date | null;
  status: "complete" | "partial" | "unavailable";
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function isIntervention(value: unknown): value is Opportunity {
  const item = record(value);
  return !!item && ["id", "title", "page", "action", "expectedOutcome", "interpretation"].every((key) => typeof item[key] === "string") &&
    ["ctr", "near_top10", "technical"].includes(String(item.kind)) && !!record(item.evidence);
}

export function actionPlanFromSnapshot(value: unknown, now: number, version: string): ActionPlan {
  const empty: ActionPlan = { actions: [], period: null, validatedAt: null, status: "unavailable" };
  const snapshot = record(value), data = record(snapshot?.data);
  if (!snapshot || !data || data.version !== version || !["complete", "partial"].includes(String(snapshot.status))) return empty;
  const date = snapshot.validatedAt instanceof Date ? snapshot.validatedAt : new Date(String(snapshot.validatedAt));
  const configuredCadence = Number(record(data.settings)?.analysisDays);
  const cadence = Number.isInteger(configuredCadence) && configuredCadence >= 1 && configuredCadence <= 90 ? configuredCadence : 7;
  const age = now - date.getTime();
  const current = record(record(data.windows)?.current);
  if (!Number.isFinite(age) || age < 0 || age > (cadence + 1) * 86400000 || !current ||
    typeof current.from !== "string" || typeof current.to !== "string" ||
    !Number.isFinite(Date.parse(current.from)) || !Number.isFinite(Date.parse(current.to)) || current.from > current.to) return empty;
  return {
    actions: Array.isArray(data.opportunities) ? data.opportunities.filter(isIntervention) : [],
    period: { from: current.from, to: current.to }, validatedAt: date,
    status: snapshot.status === "partial" ? "partial" : "complete",
  };
}

export function pageLabel(path: string) {
  if (path === "/") return "homepage";
  if (path === "/faq") return "pagina FAQ";
  if (path === "/lavora-con-noi") return "pagina Lavora con noi";
  if (path === "/configuratore") return "pagina del configuratore";
  return `pagina ${path}`;
}

export function actionTitle(item: Opportunity) {
  if (item.id.startsWith("public_url:")) return item.title;
  const page = pageLabel(item.page);
  if (item.kind === "ctr") return `Un risultato Google più chiaro per la ${page}`;
  if (item.kind === "near_top10") return `Contenuti più forti per la ${page}`;
  return `Una ${page} più completa`;
}
