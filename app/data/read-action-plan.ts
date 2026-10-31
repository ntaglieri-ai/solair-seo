import "server-only";
import { actionPlanFromSnapshot } from "./action-plan";
import { ANALYSIS_VERSION } from "../../lib/engine/analyze";
import { getLastSnapshot } from "../../lib/engine/store";
import { safeRead } from "../../lib/engine/safe";

export async function readActionPlan(siteId: string) {
  const snapshot = await safeRead("interventi proposti", () => getLastSnapshot(siteId));
  return actionPlanFromSnapshot(snapshot, Date.now(), ANALYSIS_VERSION);
}
