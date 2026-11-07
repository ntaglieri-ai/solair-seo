import { requireSeoApi, canWriteSeo } from "../../../lib/crm-auth";
import { NextRequest,NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSql } from "../../../lib/db";
import { backlinkRows,normalizeQuery,publicUrl,siteHost,validDate,validateObservation } from "../../../lib/free-research";
export async function POST(req:NextRequest){
  const denied = await requireSeoApi(req, true);
  if (denied) return denied;

  if(req.headers.get("origin")!==req.nextUrl.origin||!await canWriteSeo())return NextResponse.json({error:"Accedi come operatore per aggiornare queste fonti."},{status:401});
  if(Number(req.headers.get("content-length"))>1_100_000)return NextResponse.json({error:"File troppo grande."},{status:413});
  const sql=getSql(),site="solairgroup.it";
  try{
    const body=await req.text();if(body.length>1_100_000)throw new Error("Richiesta troppo grande.");const v=JSON.parse(body);
    const today=new Date().toISOString().slice(0,10);
    if(v.operation==="watch"||v.operation==="unwatch"){
      if(typeof v.query!=="string"||v.query.trim().length<2||v.query.length>200)throw new Error("Inserisci una query tra 2 e 200 caratteri.");
      const query=normalizeQuery(v.query);
      await sql.begin(async tx=>{
        await tx`select id from seo.sites where id=${site} for update`;
        if(v.operation==="unwatch")await tx`delete from seo.watched_keywords where site_id=${site} and query=${query}`;
        else{const [n]=await tx`select count(*)::int as n from seo.watched_keywords where site_id=${site}`;if(n.n>=100)throw new Error("Massimo 100 query da seguire.");await tx`insert into seo.watched_keywords(site_id,query) values(${site},${query}) on conflict do nothing`;}
      });
    }else if(v.operation==="rival"){
      if(typeof v.domain!=="string"||v.domain.length>250||typeof v.name!=="string"||!v.name.trim()||v.name.length>100||typeof v.reason!=="string"||v.reason.trim().length<10||v.reason.length>1000||typeof v.enabled!=="boolean")throw new Error("Servono dominio, nome, motivo del confronto e stato.");
      const url=publicUrl(v.domain.includes("://")?v.domain:`https://${v.domain}`),domain=siteHost(url);
      if(domain===site||url.pathname!=="/"||url.search)throw new Error("Indica il solo dominio di un concorrente.");
      await sql.begin(async tx=>{await tx`select id from seo.sites where id=${site} for update`;
        const [n]=await tx`select count(*)::int as n from seo.competitors where site_id=${site} and enabled and domain<>${domain}`;
        if(v.enabled&&n.n>=5)throw new Error("Massimo cinque benchmark attivi.");
        await tx`insert into seo.competitors(site_id,domain,name,reason,enabled) values(${site},${domain},${v.name.trim()},${v.reason.trim()},${v.enabled}) on conflict(site_id,domain) do update set name=excluded.name,reason=excluded.reason,enabled=excluded.enabled`;
      });
    }else if(v.operation==="backlinks"){
      if(!validDate(v.date,today)||typeof v.csv!=="string"||typeof v.filename!=="string"||!v.filename.trim()||v.filename.length>200)throw new Error("Servono CSV, nome file e data dell’esportazione.");
      const data=backlinkRows(v.csv),hash=createHash("sha256").update(JSON.stringify(data)).digest("hex");
      await sql`insert into seo.backlink_imports(site_id,observed_on,filename,fingerprint,data) values(${site},${v.date},${v.filename},${hash},${sql.json(data)}) on conflict do nothing`;
    }else if(v.operation==="ai"){
      const o=validateObservation(v,today),hash=createHash("sha256").update(JSON.stringify(o)).digest("hex");
      await sql`insert into seo.ai_observations(site_id,engine,question,context,observed_on,answer,evidence_url,sources,mentions_brand,cites_site,fingerprint)
        values(${site},${o.engine},${o.question},${o.context},${o.date},${o.answer},${o.evidenceUrl},${sql.json(o.sources)},${o.mentionsBrand},${o.citesSite},${hash}) on conflict do nothing`;
    }else throw new Error("Operazione non valida.");
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("[research] Operazione fallita",error instanceof Error?error.message:"errore");
    const message=error instanceof Error?error.message:"Richiesta non valida.";
    return NextResponse.json({error:/^Serve|^Servono|^Inserisci|^Massimo|^CSV|^Riga|^Indica|^File|^Richiesta|^Operazione/.test(message)?message:"Impossibile salvare la fonte. Controlla i dati e riprova."},{status:400});}
}
