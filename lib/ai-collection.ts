import "server-only";
import { getSql } from "./db";
import { AI_QUESTIONS } from "./free-research";
import { AI_MODEL, AI_PROTOCOL, failedAiAnswer, type AiCheckBatch, type AiCheckResult } from "./ai-checks";
import { aiConfigured, askAi } from "./ai-provider";
import { acquireLease, getEngineSettings, releaseLease } from "./engine/store";
import { isDue } from "./engine/settings";

export async function getAiChecks(siteId: string) {
  return getSql()<AiCheckBatch[]>`select id, model, protocol, trigger,
    case when status='running' and created_at<now()-interval '5 minutes' then 'failed' else status end as status, questions, results,
    created_at as "createdAt", finished_at as "finishedAt" from seo.ai_check_batches
    where site_id=${siteId} order by created_at desc limit 20`;
}

export async function collectAiChecks(siteId: string, trigger: "manual" | "cron") {
  if (siteId !== "solairgroup.it") throw new Error("Sito AI non configurato.");
  if (!aiConfigured()) return { status: "not_configured" as const };
  const settings = await getEngineSettings(siteId);
  if (trigger === "cron" && !settings.enabled) return { status: "disabled" as const };
  const lease = await acquireLease(siteId);
  if (!lease) return { status: "already_running" as const };
  const sql = getSql();
  try {
    await sql`update seo.ai_check_batches set status='failed', finished_at=now()
      where site_id=${siteId} and status='running' and created_at<now()-interval '5 minutes'`;
    const history = await getAiChecks(siteId);
    const latest = history[0];
    const lastComplete = history.find(batch => batch.status === "complete" && batch.protocol === AI_PROTOCOL && batch.model === AI_MODEL);
    if (trigger === "cron" && lastComplete && !isDue(lastComplete.createdAt, settings.analysisDays)) return { status: "not_due" as const };
    if (latest && Date.now() - new Date(latest.createdAt).getTime() < 15 * 60000) return { status: "cooldown" as const };
    // Limite persistente, incluse le raccolte fallite, indipendente da client e processo.
    const [daily] = await sql<{count:number}[]>`select count(*)::int as count from seo.ai_check_batches
      where site_id=${siteId} and (created_at at time zone 'Europe/Rome')::date=(now() at time zone 'Europe/Rome')::date`;
    if (daily.count >= 6) return { status: "daily_limit" as const };
    const rivals = await sql<{name:string}[]>`select name from seo.competitors where site_id=${siteId} and enabled order by domain limit 5`;
    const [batch] = await sql<{id:string}[]>`insert into seo.ai_check_batches(site_id,model,protocol,trigger,status,questions)
      values(${siteId},${AI_MODEL},${AI_PROTOCOL},${trigger},'running',${sql.json([...AI_QUESTIONS])}) returning id`;
    const results: AiCheckResult[] = [];
    // Due richieste alla volta: tempo massimo circa 70 secondi, nessun retry nascosto.
    for (let offset = 0; offset < AI_QUESTIONS.length; offset += 2) {
      const stop = results.find(result => result.error === "quota" || result.error === "credentials");
      const questions = AI_QUESTIONS.slice(offset, offset + 2);
      results.push(...(stop ? questions.map(question => failedAiAnswer(question, stop.error!, new Date().toISOString())) :
        await Promise.all(questions.map(question => askAi(question, rivals.map(rival => rival.name))))));
      await sql`update seo.ai_check_batches set results=${sql.json(results as never)} where id=${batch.id}`;
    }
    const measured = results.filter(result => result.status === "ok").length;
    const status = measured === AI_QUESTIONS.length ? "complete" : measured ? "partial" : "failed";
    await sql`update seo.ai_check_batches set status=${status}, finished_at=now() where id=${batch.id}`;
    return { status, batchId: batch.id, measured, expected: AI_QUESTIONS.length };
  } finally { await releaseLease(siteId, lease); }
}
