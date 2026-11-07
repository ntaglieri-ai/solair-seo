import { requireSeoApi, canWriteSeo } from "../../../lib/crm-auth";
import { NextRequest,NextResponse } from "next/server";
import { updateEngineSettings } from "../../../lib/engine/store";
export async function PATCH(request:NextRequest){
  const denied = await requireSeoApi(request, true);
  if (denied) return denied;

  if(request.headers.get("origin")!==request.nextUrl.origin||!await canWriteSeo())return NextResponse.json({error:"Accedi alle impostazioni per salvare la frequenza."},{status:401});
  try{
    const body=await request.json();
    if(!body||typeof body.enabled!=="boolean"||!Number.isInteger(body.analysisDays)||body.analysisDays<1||body.analysisDays>90||Object.keys(body).some(k=>!["enabled","analysisDays"].includes(k)))return NextResponse.json({error:"Scegli una frequenza tra 1 e 90 giorni."},{status:400});
    const settings=await updateEngineSettings("solairgroup.it",{enabled:body.enabled,analysisDays:body.analysisDays});
    return NextResponse.json({ok:true,settings},{headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({error:"Impossibile salvare le impostazioni."},{status:503});}
}
