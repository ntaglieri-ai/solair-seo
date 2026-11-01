import "server-only";
import { getSql } from "./db";
import { crawlSite, type CrawlPage } from "./engine/crawl";
import type { Evidence } from "./engine/analyze";
import type { Backlink } from "./free-research";
export type Rival={domain:string;name:string;reason:string;enabled:boolean};
export type RivalScan={domain:string;name:string;pages:CrawlPage[];limitations:string[];complete:boolean;scannedAt:string};
export type Observation={id:string;engine:string;question:string;context:string;date:string;answer:string;evidenceUrl:string|null;sources:string[];mentionsBrand:boolean;citesSite:boolean};
export async function researchAccess(){
  const {cookies}=await import("next/headers");const {OPERATOR_COOKIE,validOperatorToken}=await import("./operator");
  return validOperatorToken((await cookies()).get(OPERATOR_COOKIE)?.value,process.env.CRON_SECRET);
}
export async function getKeywords(siteId:string){
  const sql=getSql();const [batches,watch]=await Promise.all([
    sql<{data:Evidence;createdAt:Date}[]>`select e.data,e.created_at as "createdAt" from seo.evidence_batches e join seo.runs r on r.id=e.run_id where e.site_id=${siteId} and r.status='ok' order by e.created_at desc limit 60`,
    sql<{query:string}[]>`select query from seo.watched_keywords where site_id=${siteId} order by query`,
  ]);
  const distinct=new Map<string,typeof batches[number]>();
  for(const batch of batches)if(batch.data.gsc.current.queries&&!distinct.has(batch.data.windows.current.to))distinct.set(batch.data.windows.current.to,batch);
  const history=[...distinct.values()].slice(0,8);
  return {latest:history[0]??null,history,watched:watch.map(w=>w.query)};
}
export async function getRivals(siteId:string){
  return getSql()<Rival[]>`select domain,name,reason,enabled from seo.competitors where site_id=${siteId} order by domain`;
}
export async function getMarket(siteId:string){
  const sql=getSql();const [rivals,batches]=await Promise.all([getRivals(siteId),sql<{data:RivalScan[];createdAt:Date}[]>`select data,created_at as "createdAt" from seo.competitor_batches where site_id=${siteId} order by created_at desc limit 1`]);
  return {rivals,batch:batches[0]??null};
}
export async function collectMarket(siteId:string,intervalDays:number,force=false){
  const sql=getSql();const {rivals,batch}=await getMarket(siteId);
  const active=rivals.filter(r=>r.enabled).slice(0,5);
  const selected=active.map(r=>r.domain).sort().join(",");
  const scanned=(batch?.data??[]).map(r=>r.domain).sort().join(",");
  if(!force&&selected===scanned&&batch&&Date.now()-batch.createdAt.getTime()<intervalDays*86400000)return {status:"not_due"};
  const data:RivalScan[]=[];
  for(const rival of active){
    const scan=await crawlSite(`https://${rival.domain}/`,3);
    data.push({domain:rival.domain,name:rival.name,pages:scan.pages,limitations:scan.limitations,complete:scan.complete,scannedAt:new Date().toISOString()});
  }
  await sql`insert into seo.competitor_batches(site_id,data) values(${siteId},${sql.json(data as never)})`;
  return {status:"collected",sites:data.length,successfulPages:data.reduce((n,r)=>n+r.pages.filter(p=>p.status===200).length,0)};
}
export async function getBacklinks(siteId:string){
  return getSql()<{id:string;date:string;filename:string;data:Backlink[];importedAt:Date}[]>`select id,to_char(observed_on,'YYYY-MM-DD') as date,filename,data,created_at as "importedAt" from seo.backlink_imports where site_id=${siteId} order by observed_on desc,created_at desc limit 2`;
}
export async function getObservations(siteId:string){
  return getSql()<Observation[]>`select id,engine,question,context,to_char(observed_on,'YYYY-MM-DD') as date,answer,evidence_url as "evidenceUrl",sources,mentions_brand as "mentionsBrand",cites_site as "citesSite" from seo.ai_observations where site_id=${siteId} order by observed_on desc,created_at desc limit 200`;
}
export async function getAiStatus(siteId:string){
  const [row]=await getSql()<{count:number;date:string|null}[]>`select count(*)::int as count,to_char(max(observed_on),'YYYY-MM-DD') as date from seo.ai_observations where site_id=${siteId}`;
  return row;
}
