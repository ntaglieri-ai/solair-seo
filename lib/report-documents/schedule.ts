import "server-only";
import { getSql } from "../db";
import { getSites } from "../engine/collect";
import { acquireLease, getEngineSettings, releaseLease } from "../engine/store";
import { generateReportDocument } from "./store";
import { lastCompleteMonth } from "./windows";
/** Stesso PDF del flusso manuale, alla frequenza scelta; nessuna chiamata AI da questo dispatcher. */
export async function generateScheduledDocuments(now:Date=new Date()){
  const results=[];
  for(const site of await getSites()){
    if(site.id!=="solairgroup.it")continue;
    const settings=await getEngineSettings(site.id);
    if(!settings.enabled){results.push({site:site.id,status:"disabled"});continue;}
    const lease=await acquireLease(site.id);
    if(!lease){results.push({site:site.id,status:"already_running"});continue;}
    try{
      const sql=getSql();
      // Mensile: dal 4 del mese, se manca il documento del mese solare precedente (e il servizio è già partito con uno start-up).
      const today=now.toISOString().slice(0,10);
      if(Number(today.slice(8,10))<4){results.push({site:site.id,status:"not_due"});continue;}
      const target=lastCompleteMonth(today);
      const [started]=await sql`select 1 from seo.report_documents where site_id=${site.id} and kind='startup' limit 1`;
      if(!started){results.push({site:site.id,status:"waiting_for_startup"});continue;}
      const [exists]=await sql`select 1 from seo.report_documents where site_id=${site.id} and kind='monthly' and period_to=${target.to} limit 1`;
      if(exists){results.push({site:site.id,status:"not_due"});continue;}
      const [pending]=await sql`select status from seo.geo_scans where site_id=${site.id} order by started_at desc limit 1`;
      if(pending?.status==="running"){results.push({site:site.id,status:"waiting_for_geo"});continue;}
      const document=await generateReportDocument({kind:"monthly",trigger:"scheduled"});
      if(document)await sql`insert into seo.report_pdf_schedule(site_id,last_generated_at,document_id) values(${site.id},now(),${document.id})
        on conflict(site_id) do update set last_generated_at=excluded.last_generated_at,document_id=excluded.document_id`;
      results.push({site:site.id,status:document?document.reused?"unchanged":"generated":"no_analysis",documentId:document?.id??null});
    } finally { await releaseLease(site.id,lease); }
  }
  return results;
}
