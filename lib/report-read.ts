import "server-only";
import { getSql } from "./db";
import { getLastSnapshot } from "./engine/store";
import type { Opportunity,ReviewCheck } from "./engine/analyze";

export type ReportTotals={clicks:number;impressions:number;ctr:number;position:number};
export type StoredReport={id:string;status:string;createdAt:Date;validatedAt:Date;data:{
  version?:string;
  sourceRunIds?:{technical?:string|null;evidence?:string|null};
  windows?:{current:{from:string;to:string};previous:{from:string;to:string}};
  summary?:{current:ReportTotals;previous:ReportTotals;ga4TimeZones?:string[]};
  opportunities?:Opportunity[];checks?:ReviewCheck[];limitations?:string[];
}};
export async function readReport(id?:string):Promise<StoredReport|null>{
  if(!id)return await getLastSnapshot("solairgroup.it") as StoredReport|null;
  if(!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id))return null;
  const [row]=await getSql()<StoredReport[]>`select a.id,a.status,a.data,a.created_at as "createdAt",
    coalesce(s.validated_at,r.finished_at,a.created_at) as "validatedAt"
    from seo.analysis_snapshots a join seo.runs r on r.id=a.run_id
    left join seo.engine_state s on s.snapshot_id=a.id and s.site_id=a.site_id
    where a.site_id='solairgroup.it' and a.id=${id}`;
  return row??null;
}
export type ReportEntry={id:string;status:string;date:Date;from:string|null;to:string|null;trigger:string;clicks:number|null;opportunities:number|null};
export async function readReportArchive(page:number){
  const sql=getSql(),offset=(page-1)*20;
  const [rows,[count]]=await Promise.all([
    sql<ReportEntry[]>`select a.id,a.status,coalesce(s.validated_at,r.finished_at,a.created_at) as date,
      a.data #>> '{windows,current,from}' as "from",a.data #>> '{windows,current,to}' as "to",r.trigger,
      (a.data #>> '{summary,current,clicks}')::int as clicks,
      (a.data #>> '{summary,opportunities}')::int as opportunities
      from seo.analysis_snapshots a join seo.runs r on r.id=a.run_id
      left join seo.engine_state s on s.snapshot_id=a.id and s.site_id=a.site_id
      where a.site_id='solairgroup.it' order by date desc,a.id desc limit 20 offset ${offset}`,
    sql<{total:number}[]>`select count(*)::int as total from seo.analysis_snapshots where site_id='solairgroup.it'`,
  ]);
  return {rows,total:count.total,page,pages:Math.max(1,Math.ceil(count.total/20))};
}
