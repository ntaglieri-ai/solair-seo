import "server-only";
import { getSql } from "../db";
import { accountedCost, budgetPeriod, canReserve, stopThreshold } from "./budget";
import type { GeoAnswer } from "./answer";
import type { GeoSeoContext } from "./seo-context";
import type { PilotEngine } from "../geo-pilot/protocol";

export type GeoFrequency = "manual" | "weekly" | "biweekly" | "monthly";
export const FREQUENCY_DAYS: Record<Exclude<GeoFrequency, "manual">, number> = { weekly: 7, biweekly: 14, monthly: 30 };

export type GeoSettings = {
  siteId: string; enabled: boolean; engine: PilotEngine; frequency: GeoFrequency; promptSetVersion: string;
  monthlyBudgetMicrousd: number; scanBudgetMicrousd: number; requestReserveMicrousd: number;
};
export type GeoScan = {
  id: string; siteId: string; trigger: "manual" | "scheduled"; status: "running" | "done" | "partial" | "failed";
  engine: PilotEngine; model: string | null; promptSetVersion: string; plannedPrompts: number; completedPrompts: number;
  seoContext: GeoSeoContext | null; scanBudgetMicrousd: number; stopReason: string | null; startedAt: Date; finishedAt: Date | null;
};
export type GeoRequestRow = { id: string; promptId: string; engine: PilotEngine; state: "reserved" | "settled" | "uncertain";
  accountedMicrousd: number; result: GeoAnswer | null; errorCode: string | null };

const settingsColumns = (sql: ReturnType<typeof getSql>) => sql`site_id as "siteId", enabled, engine, frequency, prompt_set_version as "promptSetVersion",
  monthly_budget_microusd::float8 as "monthlyBudgetMicrousd", scan_budget_microusd::float8 as "scanBudgetMicrousd",
  request_reserve_microusd::float8 as "requestReserveMicrousd"`;
const scanColumns = (sql: ReturnType<typeof getSql>) => sql`id, site_id as "siteId", trigger, status, engine, model, prompt_set_version as "promptSetVersion",
  seo_context as "seoContext", planned_prompts as "plannedPrompts", completed_prompts as "completedPrompts", scan_budget_microusd::float8 as "scanBudgetMicrousd",
  stop_reason as "stopReason", started_at as "startedAt", finished_at as "finishedAt"`;

/** Senza riga di impostazioni il livello 2 è spento: nessuna scansione a pagamento per default. */
export async function getGeoSettings(siteId: string): Promise<GeoSettings | null> {
  const sql = getSql();
  const [row] = await sql<GeoSettings[]>`select ${settingsColumns(sql)} from seo.geo_settings where site_id=${siteId}`;
  return row ?? null;
}

export async function getCompetitorNames(siteId: string): Promise<string[]> {
  const rows = await getSql()<{ name: string }[]>`select name from seo.competitors where site_id=${siteId} and enabled order by domain limit 10`;
  return rows.map(row => row.name);
}

export async function getGeoScans(siteId: string, limit = 12) {
  const sql = getSql();
  return sql<GeoScan[]>`select ${scanColumns(sql)} from seo.geo_scans where site_id=${siteId} order by started_at desc limit ${limit}`;
}

export async function getGeoRequests(scanId: string) {
  return getSql()<GeoRequestRow[]>`select id, prompt_id as "promptId", engine, state, accounted_microusd::float8 as "accountedMicrousd",
    result, error_code as "errorCode" from seo.geo_scan_requests where scan_id=${scanId} order by created_at`;
}

/** Una scansione aperta si riprende anche al passaggio giornaliero successivo. */
export async function openOrCreateScan(settings: GeoSettings, trigger: "manual" | "scheduled", planned: number) {
  const sql = getSql();
  return sql.begin(async tx => {
    // Una precedente invocazione terminata può aver lasciato una richiesta prenotata.
    // Conserva la riserva: il provider potrebbe averla già fatturata.
    await tx`update seo.geo_scan_requests set state='uncertain', error_code='interrupted', finished_at=now()
      where state='reserved' and scan_id in (select id from seo.geo_scans where site_id=${settings.siteId} and status='running')`;
    const [open] = await tx<GeoScan[]>`select ${scanColumns(tx as never)} from seo.geo_scans
      where site_id=${settings.siteId} and status='running' and prompt_set_version=${settings.promptSetVersion} and engine=${settings.engine}
      order by started_at desc limit 1`;
    if (open) return { scan: open, resumed: true };
    const [snapshot] = await tx`select a.id, a.data, a.created_at from seo.engine_state s
      join seo.analysis_snapshots a on a.id=s.snapshot_id where s.site_id=${settings.siteId}`;
    const context: GeoSeoContext | null = snapshot ? { snapshotId: snapshot.id, capturedAt: new Date(snapshot.created_at).toISOString(),
      windows: snapshot.data.windows ?? null, opportunities: snapshot.data.opportunities ?? [] } : null;
    const [scan] = await tx<GeoScan[]>`insert into seo.geo_scans(site_id,trigger,engine,prompt_set_version,planned_prompts,scan_budget_microusd,seo_context)
      values(${settings.siteId},${trigger},${settings.engine},${settings.promptSetVersion},${planned},${settings.scanBudgetMicrousd},${context ? tx.json(context as never) : null})
      returning ${scanColumns(tx as never)}`;
    return { scan, resumed: false };
  });
}

export type Reservation =
  | { status: "reserved"; id: string; reserve: number }
  | { status: "existing" }
  | { status: "blocked"; reason: "period_budget" | "scan_budget" | "invalid" | "disabled" };

/**
 * Prenota la spesa PRIMA della chiamata, in una transazione che blocca la riga del budget:
 * due richieste in parallelo non possono superare insieme la soglia. Un tetto applicativo non
 * può comunque annullare un costo già in corso presso il fornitore.
 */
export async function reserveRequest(settings: GeoSettings, scan: GeoScan, promptId: string): Promise<Reservation> {
  const period = budgetPeriod(settings.siteId, new Date());
  return getSql().begin(async tx => {
    // Rileggi e blocca le preferenze: una disattivazione o un budget ridotto
    // impedisce le nuove chiamate anche durante una scansione già avviata.
    const [current] = await tx<GeoSettings[]>`select ${settingsColumns(tx as never)} from seo.geo_settings where site_id=${settings.siteId} for update`;
    if (!current?.enabled) return { status: "blocked" as const, reason: "disabled" as const };
    if (current.engine !== scan.engine || current.promptSetVersion !== scan.promptSetVersion) return { status: "blocked" as const, reason: "invalid" as const };
    settings = current;
    if (settings.monthlyBudgetMicrousd <= 0) return { status: "blocked" as const, reason: "period_budget" as const };
    // Il limite del periodo segue le impostazioni correnti, così una modifica vale subito.
    await tx`insert into seo.geo_budgets(id,site_id,period_start,period_end,limit_microusd,stop_microusd)
      values(${period.id},${settings.siteId},${period.start},${period.end},${settings.monthlyBudgetMicrousd},${stopThreshold(settings.monthlyBudgetMicrousd)})
      on conflict (id) do update set limit_microusd=excluded.limit_microusd, stop_microusd=excluded.stop_microusd`;
    await tx`select id from seo.geo_budgets where id=${period.id} for update`;
    // Serializza anche il budget della scansione quando le richieste attraversano il cambio mese.
    await tx`select id from seo.geo_scans where id=${scan.id} for update`;
    const [existing] = await tx`select id from seo.geo_scan_requests where scan_id=${scan.id} and prompt_id=${promptId} and engine=${settings.engine}`;
    if (existing) return { status: "existing" as const };
    const [periodUsage] = await tx<{ total: number }[]>`select coalesce(sum(accounted_microusd),0)::float8 as total from seo.geo_scan_requests where budget_id=${period.id}`;
    const [scanUsage] = await tx<{ total: number }[]>`select coalesce(sum(accounted_microusd),0)::float8 as total from seo.geo_scan_requests where scan_id=${scan.id}`;
    const decision = canReserve({ periodAccounted: periodUsage.total, periodLimit: settings.monthlyBudgetMicrousd,
      scanAccounted: scanUsage.total, scanLimit: Math.min(scan.scanBudgetMicrousd, settings.scanBudgetMicrousd) }, settings.requestReserveMicrousd);
    if (!decision.ok) return { status: "blocked" as const, reason: decision.reason };
    const [request] = await tx<{ id: string }[]>`insert into seo.geo_scan_requests(scan_id,budget_id,prompt_id,engine,state,reserved_microusd,accounted_microusd)
      values(${scan.id},${period.id},${promptId},${settings.engine},'reserved',${settings.requestReserveMicrousd},${settings.requestReserveMicrousd}) returning id`;
    return { status: "reserved" as const, id: request.id, reserve: settings.requestReserveMicrousd };
  });
}

/** Costo ignoto o errore: la riserva intera resta contabilizzata. Nessun ripristino automatico. */
export async function finishRequest(id: string, result: GeoAnswer | null, reserve: number, errorCode: string | null = null) {
  const sql = getSql();
  const known = typeof result?.estimatedUsd === "number" && Number.isFinite(result.estimatedUsd) && result.estimatedUsd >= 0;
  await sql`update seo.geo_scan_requests set state=${known ? "settled" : "uncertain"},
    accounted_microusd=${accountedCost(result?.estimatedUsd ?? null, reserve)},
    result=${result ? sql.json(result as never) : null}, error_code=${errorCode}, finished_at=now()
    where id=${id} and state='reserved'`;
}

export async function saveVerifiedResult(id: string, result: GeoAnswer) {
  const sql = getSql();
  await sql`update seo.geo_scan_requests set result=${sql.json(result as never)} where id=${id} and state in ('settled','uncertain')`;
}

export async function updateScan(id: string, fields: { completedPrompts: number; status?: GeoScan["status"]; stopReason?: string | null; model?: string | null }) {
  const sql = getSql();
  const finished = fields.status && fields.status !== "running";
  await sql`update seo.geo_scans set completed_prompts=${fields.completedPrompts},
    status=coalesce(${fields.status ?? null},status), stop_reason=${fields.stopReason ?? null},
    model=coalesce(${fields.model ?? null},model), finished_at=${finished ? sql`now()` : null} where id=${id}`;
}

export async function getBudgetUsage(siteId: string) {
  const period = budgetPeriod(siteId, new Date());
  const [row] = await getSql()<{ accounted: number }[]>`select coalesce(sum(accounted_microusd),0)::float8 as accounted
    from seo.geo_scan_requests where budget_id=${period.id}`;
  return { periodStart: period.start, periodEnd: period.end, accountedMicrousd: row.accounted };
}

export async function saveGeoSettings(siteId: string, input: { enabled: boolean; frequency: GeoFrequency; monthlyBudgetMicrousd: number; scanBudgetMicrousd: number }) {
  await getSql()`insert into seo.geo_settings(site_id,enabled,frequency,monthly_budget_microusd,scan_budget_microusd)
    values(${siteId},${input.enabled},${input.frequency},${input.monthlyBudgetMicrousd},${input.scanBudgetMicrousd})
    on conflict (site_id) do update set enabled=excluded.enabled, frequency=excluded.frequency,
      monthly_budget_microusd=excluded.monthly_budget_microusd, scan_budget_microusd=excluded.scan_budget_microusd, updated_at=now()`;
}
