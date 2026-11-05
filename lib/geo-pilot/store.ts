import "server-only";
import { getSql } from "../db";
import { PILOT_BUDGET_ID, BUDGET_MICROUSD, REQUEST_RESERVE_MICROUSD, canReserve, accountedCost } from "./budget";
import type { PilotAnswer, PilotEngine } from "./protocol";

export type PilotStored = { id: string; promptId: string; engine: PilotEngine; state: "reserved" | "settled" | "uncertain";
  accountedMicrousd: number; result: PilotAnswer | null; errorCode: string | null; createdAt: Date };
export async function getPilotRequests() {
  return getSql()<PilotStored[]>`select id,prompt_id as "promptId",engine,state,accounted_microusd::int as "accountedMicrousd",result,
    error_code as "errorCode",created_at as "createdAt" from seo.geo_pilot_requests where budget_id=${PILOT_BUDGET_ID} order by created_at`;
}
export async function reservePilotRequest(promptId: string, engine: PilotEngine) {
  const sql = getSql();
  return sql.begin(async tx => {
    await tx`insert into seo.geo_pilot_budgets(id,site_id,limit_microusd) values(${PILOT_BUDGET_ID},'solairgroup.it',${BUDGET_MICROUSD}) on conflict do nothing`;
    await tx`select id from seo.geo_pilot_budgets where id=${PILOT_BUDGET_ID} for update`;
    const [existing] = await tx`select id from seo.geo_pilot_requests where budget_id=${PILOT_BUDGET_ID} and prompt_id=${promptId} and engine=${engine}`;
    if (existing) return { status: "existing" as const };
    const [usage] = await tx`select coalesce(sum(accounted_microusd),0)::int as total from seo.geo_pilot_requests where budget_id=${PILOT_BUDGET_ID}`;
    if (!canReserve(usage.total, REQUEST_RESERVE_MICROUSD)) return { status: "budget_stop" as const };
    const [request] = await tx<{id:string}[]>`insert into seo.geo_pilot_requests(budget_id,prompt_id,engine,state,reserved_microusd,accounted_microusd)
      values(${PILOT_BUDGET_ID},${promptId},${engine},'reserved',${REQUEST_RESERVE_MICROUSD},${REQUEST_RESERVE_MICROUSD}) returning id`;
    return { status: "reserved" as const, id: request.id };
  });
}
export async function finishPilotRequest(id: string, result: PilotAnswer | null, errorCode: string | null = null) {
  const sql = getSql();
  const known = result?.estimatedUsd !== null && result?.estimatedUsd !== undefined;
  await sql`update seo.geo_pilot_requests set state=${known ? "settled" : "uncertain"},
    accounted_microusd=${accountedCost(result?.estimatedUsd ?? null, REQUEST_RESERVE_MICROUSD)},
    result=${result ? sql.json(result as never) : null},error_code=${errorCode},finished_at=now()
    where id=${id} and state='reserved'`;
}
