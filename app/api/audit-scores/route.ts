import { NextRequest,NextResponse } from "next/server";
import { authorizedEngine } from "../../../lib/engine/auth";
import { validateAudit } from "../../../lib/audit-trend";
import { getSql } from "../../../lib/db";
export async function POST(req:NextRequest) {
  if(!authorizedEngine(req))return NextResponse.json({error:"Non autorizzato."},{status:401});
  let input;try{input=validateAudit(await req.json(),new Date().toISOString().slice(0,10));}catch{return NextResponse.json({error:"Audit non valido: servono data, punteggio, metodo e fonte."},{status:400});}
  const sql=getSql();
  try{
    await sql.begin(async(tx)=>{
      await tx`select id from seo.sites where id='solairgroup.it' for update`;
      const [start]=await tx`select methodology,to_char(assessed_on,'YYYY-MM-DD') as date from seo.audit_scores where site_id='solairgroup.it' and starts_service`;
      if((!start&&!input.startsService)||(start&&input.startsService))throw new Error("L’avvio del servizio deve essere registrato una sola volta.");
      if(start&&input.date<start.date)throw new Error("La data precede l’avvio del servizio.");
      await tx`insert into seo.audit_scores(site_id,assessed_on,score,methodology,source,service,starts_service)
        values('solairgroup.it',${input.date},${input.score},${input.methodology},${input.source},true,${input.startsService})`;
    });
    return NextResponse.json({ok:true},{status:201});
  }catch(e){console.error("[audit-scores] Pubblicazione fallita",e);return NextResponse.json({error:"Audit non pubblicato. Verifica data e avvio del servizio."},{status:409});}
}
