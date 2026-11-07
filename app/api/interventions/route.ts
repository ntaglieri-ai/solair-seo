import { requireSeoApi, canWriteSeo } from "../../../lib/crm-auth";
import { NextRequest, NextResponse } from "next/server";
import { getWork, saveWork, captureMeasurement } from "../../../lib/interventions-store";
import { newWorkItem, transitionWork, workIdentity } from "../../../lib/interventions";
import { readActionPlan } from "../../data/read-action-plan";

export async function PATCH(req:NextRequest) {
  const denied = await requireSeoApi(req, true);
  if (denied) return denied;

  if(req.headers.get("origin")!==req.nextUrl.origin || !await canWriteSeo())
    return NextResponse.json({error:"Accedi alla gestione interventi per modificare il piano."},{status:401});
  let body;try{body=await req.json();}catch{return NextResponse.json({error:"Richiesta non valida."},{status:400});}
  if(typeof body?.actionId!=="string" || body.actionId.length>1000) return NextResponse.json({error:"Intervento non valido."},{status:400});
  const siteId="solairgroup.it";
  try {
    const [plan,saved]=await Promise.all([readActionPlan(siteId),getWork(siteId)]);
    const existing=saved.find((item)=>item.actionId===body.actionId);
    const proposal=plan.actions.find((item)=>workIdentity(item)===body.actionId);
    if(!existing&&!proposal) return NextResponse.json({error:"Proposta non più disponibile."},{status:404});
    const before=existing??newWorkItem({...proposal!,evidence:{...proposal!.evidence,...(plan.period?{periodFrom:plan.period.from,periodTo:plan.period.to}:{})}});
    const next=transitionWork(before,body,new Date().toISOString());
    if(body.operation==="complete") next.measurement=await captureMeasurement(siteId,next.completedAt!);
    await saveWork(siteId,next,before.revision);
    return NextResponse.json({item:next},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[interventions] Aggiornamento fallito",error);
    return NextResponse.json({error:error instanceof Error && /piano è cambiato|attività|approvat|verifica|intervento|Operazione|Aggiornamento/i.test(error.message)?error.message:"Impossibile salvare. Riprova tra poco."},{status:409});
  }
}
