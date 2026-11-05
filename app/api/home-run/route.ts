import { NextRequest, NextResponse } from "next/server";
import { getSql } from "../../../lib/db";
import { getSite } from "../../../lib/engine/collect";
import { runEngine } from "../../../lib/engine/run";
import { OPERATOR_COOKIE, validOperatorToken } from "../../../lib/operator";
import { getGeoSettings } from "../../../lib/geo/store";
import { geoConfigured } from "../../../lib/geo/run-scan";
import { getLastSnapshot } from "../../../lib/engine/store";

export const maxDuration = 300;
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({error:"Richiesta non consentita."},{status:403,headers});
  if (Number(request.headers.get("content-length")) > 1000) return NextResponse.json({error:"Richiesta non valida."},{status:400,headers});
  let body;
  try { const raw=await request.text();if(raw.length>1000)throw new Error();body=JSON.parse(raw); }
  catch { return NextResponse.json({error:"Richiesta non valida."},{status:400,headers}); }
  if (!body || !["status","analysis"].includes(body.mode) || Object.keys(body).some(k=>k!=="mode")) return NextResponse.json({error:"Operazione non valida."},{status:400,headers});
  const siteId="solairgroup.it",mode=body.mode as "status"|"analysis";
  try {
    const sql=getSql();
    const [slot]=await sql`insert into seo.manual_requests(site_id,mode,next_allowed_at) values(${siteId},${mode},now()+interval '5 minutes')
      on conflict(site_id,mode) do update set next_allowed_at=excluded.next_allowed_at
      where seo.manual_requests.next_allowed_at<=now() returning mode`;
    if(!slot)return NextResponse.json({error:"Questa operazione è già stata richiesta negli ultimi cinque minuti. Puoi consultare l’ultimo risultato oppure riprovare tra poco."},{status:429,headers:{...headers,"Retry-After":"300"}});
    const site=await getSite(siteId);
    if(!site)return NextResponse.json({error:"Sito non disponibile."},{status:503,headers});
    const result=await runEngine(site,{force:true,trigger:"manual",mode});
    if(result.skipped)return NextResponse.json({error:"Un’elaborazione è già in corso. Attendi il completamento prima di avviarne un’altra."},{status:409,headers});
    if(mode==="analysis"){
      const snapshot=await getLastSnapshot(siteId);
      if(!snapshot)return NextResponse.json({error:"Analisi non disponibile. Controlla lo stato delle fonti."},{status:503,headers});
      const geo = await getGeoSettings(siteId).catch(() => null);
      const geoAvailable = Boolean(geo?.enabled && geoConfigured(geo.engine) && validOperatorToken(request.cookies.get(OPERATOR_COOKIE)?.value, process.env.CRON_SECRET));
      return NextResponse.json({ok:result.ok,partial:!result.ok,geoAvailable,url:`/analisi?id=${snapshot.id}`,message:result.ok?null:"Alcune fonti non sono state aggiornate: il report ne indica i limiti."},{headers});
    }
    return NextResponse.json({ok:result.ok,partial:!result.ok,url:"/current-status",message:result.ok?null:"La raccolta è parziale. Controlla le date e lo stato delle fonti."},{headers});
  }catch(error){console.error("[home-run] Elaborazione fallita",error);return NextResponse.json({error:"Non è stato possibile completare l’operazione. Gli ultimi dati restano consultabili."},{status:503,headers});}
}
