import { NextRequest,NextResponse } from "next/server";
import { authorizedEngine } from "../../../../lib/engine/auth";
import { generateScheduledDocuments } from "../../../../lib/report-documents/schedule";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;
export async function GET(request:NextRequest){
  if(!authorizedEngine(request))return NextResponse.json({error:"Non autorizzato."},{status:401});
  try{return NextResponse.json({results:await generateScheduledDocuments()},{headers:{"Cache-Control":"no-store"}});}
  catch{console.error("[report-pdf-cron] Generazione non completata.");return NextResponse.json({error:"Report PDF non generati. Gli ultimi documenti restano disponibili."},{status:503});}
}
