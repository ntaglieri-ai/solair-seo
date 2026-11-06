import "server-only";
import { getSql } from "../db";
import { getSites } from "../engine/collect";
import { acquireLease, getEngineSettings, releaseLease } from "../engine/store";
import { isDue } from "../engine/settings";
import { generateReportDocument } from "./store";
/** Stesso PDF del flusso manuale, alla frequenza scelta; nessuna chiamata AI da questo dispatcher. */
export async function generateScheduledDocuments(){
  const results=[];
  for(const site of await getSites()){
    if(site.id!=="solairgroup.it")continue;
    const settings=await getEngineSettings(site.id);
    if(!settings.enabled){results.push({site:site.id,status:"disabled"});continue;}
    const lease=await acquireLease(site.id);
    if(!lease){results.push({site:site.id,status:"already_running"});continue;}
    try{
      const sql=getSql();
      const [state]=await sql<{lastGeneratedAt:Date}[]>`select last_generated_at as "lastGeneratedAt" from seo.report_pdf_schedule where site_id=${site.id}`;
      if(!isDue(state?.lastGeneratedAt??null,settings.analysisDays)){results.push({site:site.id,status:"not_due"});continue;}
      const [pending]=await sql`select status from seo.geo_scans where site_id=${site.id} order by started_at desc limit 1`;
      if(pending?.status==="running"){results.push({site:site.id,status:"waiting_for_geo"});continue;}
      const document=await generateReportDocument({trigger:"scheduled"});
      if(document)await sql`insert into seo.report_pdf_schedule(site_id,last_generated_at,document_id) values(${site.id},now(),${document.id})
        on conflict(site_id) do update set last_generated_at=excluded.last_generated_at,document_id=excluded.document_id`;
      results.push({site:site.id,status:document?document.reused?"unchanged":"generated":"no_analysis",documentId:document?.id??null});
    } finally { await releaseLease(site.id,lease); }
  }
  return results;
}
