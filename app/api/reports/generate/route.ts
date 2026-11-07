import { requireSeoApi } from "../../../../lib/crm-auth";
import { NextRequest, NextResponse } from "next/server";
import { authorizedEngine } from "../../../../lib/engine/auth";
import { generateReportDocument, ReportWindowError } from "../../../../lib/report-documents/store";
import { UUID } from "../../../../lib/report-documents/model";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
const headers={"Cache-Control":"no-store"};
/** Esporta solo fonti già archiviate del sito fisso. Non avvia raccolte né consumi AI. */
export async function POST(request:NextRequest){
  const denied = authorizedEngine(request) ? null : await requireSeoApi(request, true);
  if (denied) return denied;

  if(!authorizedEngine(request)&&request.headers.get("origin")!==request.nextUrl.origin)return NextResponse.json({error:"Richiesta non consentita."},{status:403,headers});
  let input:{kind?:"startup"|"monthly"|"update";snapshotId?:string;geoScanId?:string;geoRefreshFailed?:boolean;sourceRefreshFailed?:boolean};
  try{
    const raw=await request.text();if(raw.length>1500)throw new Error();const body=raw?JSON.parse(raw):{};
    if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).some(k=>!["kind","snapshotId","geoScanId","geoRefreshFailed","sourceRefreshFailed"].includes(k)))throw new Error();
    if(body.kind!==undefined&&!["startup","monthly","update"].includes(body.kind))throw new Error();
    for(const key of ["snapshotId","geoScanId"])if(body[key]!==undefined&&(typeof body[key]!=="string"||!UUID.test(body[key])))throw new Error();
    for(const key of ["geoRefreshFailed","sourceRefreshFailed"])if(body[key]!==undefined&&typeof body[key]!=="boolean")throw new Error();input=body;
  }catch{return NextResponse.json({error:"Riferimenti del report non validi."},{status:400,headers});}
  try{
    const result=await generateReportDocument({...input,trigger:"manual"});
    return result?NextResponse.json(result,{headers}):NextResponse.json({error:"Analisi non disponibile. Genera prima il report dalla home."},{status:404,headers});
  }catch(error){
    if(error instanceof ReportWindowError){
      const messages={NO_DATA:"Non ci sono ancora dati Search Console archiviati per questo periodo.",NEEDS_STARTUP:"Genera prima il report Start-up: l’aggiornamento parte dal suo periodo.",TOO_FEW_DAYS:"Dal report precedente ci sono meno di 3 giorni di dati nuovi. Search Console arriva con circa 3 giorni di ritardo: riprova tra qualche giorno."};
      return NextResponse.json({error:messages[error.code]},{status:error.code==="NO_DATA"?503:409,headers});
    }
    const pending=error instanceof Error&&error.message==="GEO_NOT_READY";
    console.error("[report-pdf] Documento non generato.");
    return NextResponse.json({error:pending?"La rilevazione Gemini è ancora in corso o non è disponibile.":"Il PDF non è stato generato. Le analisi salvate restano disponibili: riprova tra poco."},{status:pending?409:503,headers});
  }
}
