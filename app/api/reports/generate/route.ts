import { NextRequest, NextResponse } from "next/server";
import { authorizedEngine } from "../../../../lib/engine/auth";
import { generateReportDocument } from "../../../../lib/report-documents/store";
import { UUID } from "../../../../lib/report-documents/model";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
const headers={"Cache-Control":"no-store"};
/** Esporta solo fonti già archiviate del sito fisso. Non avvia raccolte né consumi AI. */
export async function POST(request:NextRequest){
  if(!authorizedEngine(request)&&request.headers.get("origin")!==request.nextUrl.origin)return NextResponse.json({error:"Richiesta non consentita."},{status:403,headers});
  let input:{snapshotId?:string;geoScanId?:string;geoRefreshFailed?:boolean;sourceRefreshFailed?:boolean};
  try{
    const raw=await request.text();if(raw.length>1500)throw new Error();const body=raw?JSON.parse(raw):{};
    if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).some(k=>!["snapshotId","geoScanId","geoRefreshFailed","sourceRefreshFailed"].includes(k)))throw new Error();
    for(const key of ["snapshotId","geoScanId"])if(body[key]!==undefined&&(typeof body[key]!=="string"||!UUID.test(body[key])))throw new Error();
    for(const key of ["geoRefreshFailed","sourceRefreshFailed"])if(body[key]!==undefined&&typeof body[key]!=="boolean")throw new Error();input=body;
  }catch{return NextResponse.json({error:"Riferimenti del report non validi."},{status:400,headers});}
  try{
    const result=await generateReportDocument({...input,trigger:"manual"});
    return result?NextResponse.json(result,{headers}):NextResponse.json({error:"Analisi non disponibile. Genera prima il report dalla home."},{status:404,headers});
  }catch(error){
    const pending=error instanceof Error&&error.message==="GEO_NOT_READY";
    console.error("[report-pdf] Documento non generato.");
    return NextResponse.json({error:pending?"La rilevazione Gemini è ancora in corso o non è disponibile.":"Il PDF non è stato generato. Le analisi salvate restano disponibili: riprova tra poco."},{status:pending?409:503,headers});
  }
}
