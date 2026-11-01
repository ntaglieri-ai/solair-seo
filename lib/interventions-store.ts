import "server-only";
import { getSql } from "./db";
import { comparisonWindow, type Measurement, type WorkItem } from "./interventions";
import { shiftDay } from "./engine/settings";

export async function getWork(siteId: string): Promise<WorkItem[]> {
  const rows = await getSql()`select action_id as "actionId", proposal, tasks, approved_at as "approvedAt", completed_at as "completedAt",
    verified_at as "verifiedAt", verification_note as "verificationNote", measurement, revision
    from seo.interventions where site_id=${siteId} order by updated_at desc`;
  return rows.map((r)=>({ ...r, approvedAt:r.approvedAt?.toISOString()??null,completedAt:r.completedAt?.toISOString()??null,verifiedAt:r.verifiedAt?.toISOString()??null })) as WorkItem[];
}

export async function measurementBetween(siteId: string, from: string, to: string): Promise<Measurement> {
  const sql = getSql();
  const finalizedThrough=shiftDay(new Date().toISOString().slice(0,10),-3);
  const [[gsc],[ga4]] = await Promise.all([
    sql`select coalesce(sum(clicks),0)::int as clicks,coalesce(sum(impressions),0)::int as impressions,count(*)::int as days
      from seo.gsc_daily where site_id=${siteId} and date between ${from} and ${to} and date<=${finalizedThrough}`,
    sql`select coalesce(sum(sessions) filter(where channel='Organic Search'),0)::int as sessions,
      count(distinct date) filter(where channel='all')::int as days from seo.ga4_daily where site_id=${siteId} and date between ${from} and ${to} and date<=${finalizedThrough}`,
  ]);
  return { from,to,clicks:gsc.clicks,impressions:gsc.impressions,days:gsc.days,sessions:ga4.sessions,analyticsDays:ga4.days };
}
export async function captureMeasurement(siteId: string, completedAt: string) {
  const [r] = await getSql()`select to_char(max(date),'YYYY-MM-DD') as last from seo.gsc_daily where site_id=${siteId}`;
  if (!r.last) return null;
  const before = shiftDay(completedAt.slice(0,10),-3);
  const to = r.last < before ? r.last : before;
  return measurementBetween(siteId,shiftDay(to,-27),to);
}
export async function getOutcomes(siteId: string, items: WorkItem[]) {
  return Promise.all(items.filter((item)=>item.completedAt).map(async(item)=>{
    const period=comparisonWindow(item.completedAt!);
    return {actionId:item.actionId,after:await measurementBetween(siteId,period.from,period.to)};
  }));
}

export async function saveWork(siteId: string, next: WorkItem, previousRevision: number) {
  const sql = getSql();
  await sql.begin(async(tx)=>{
    const rows = previousRevision===0 ? await tx`insert into seo.interventions(site_id,action_id,proposal,tasks,approved_at,completed_at,verified_at,verification_note,measurement,revision)
      values(${siteId},${next.actionId},${tx.json(next.proposal as never)},${tx.json(next.tasks)},${next.approvedAt},${next.completedAt},${next.verifiedAt},${next.verificationNote},${next.measurement ? tx.json(next.measurement) : null},${next.revision})
      on conflict(site_id,action_id) do nothing returning action_id`
      : await tx`update seo.interventions set tasks=${tx.json(next.tasks)},approved_at=${next.approvedAt},completed_at=${next.completedAt},
        verified_at=${next.verifiedAt},verification_note=${next.verificationNote},measurement=${next.measurement?tx.json(next.measurement):null},revision=${next.revision},updated_at=now()
        where site_id=${siteId} and action_id=${next.actionId} and revision=${previousRevision} returning action_id`;
    if (!rows.length) throw new Error("Il piano è cambiato. Ricarica la pagina.");
    await tx`insert into seo.intervention_log(site_id,action_id,revision,data) values(${siteId},${next.actionId},${next.revision},${tx.json(next as never)})`;
  });
}
