import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSql } from "../../../lib/db";
import { OPERATOR_COOKIE, operatorToken, validOperatorKey } from "../../../lib/operator";
export const dynamic="force-dynamic";
export async function POST(req: NextRequest) {
  if(req.headers.get("origin")!==req.nextUrl.origin) return NextResponse.json({error:"Origine non valida."},{status:403});
  const secret=process.env.CRON_SECRET;
  if(!secret) return NextResponse.json({error:"Accesso operatore non disponibile."},{status:503});
  let input; try { input=await req.json(); } catch { return NextResponse.json({error:"Richiesta non valida."},{status:400}); }
  if(typeof input?.key!=="string" || input.key.length>100) return NextResponse.json({error:"Codice non valido."},{status:400});
  const identity=createHash("sha256").update(req.headers.get("x-forwarded-for")?.split(",")[0]??"local").digest("hex");
  const sql=getSql();
  const [attempt] = await sql`insert into seo.operator_attempts(identity,attempts,window_start) values(${identity},1,now())
    on conflict(identity) do update set attempts=case when seo.operator_attempts.window_start<now()-interval '15 minutes' then 1 else seo.operator_attempts.attempts+1 end,
      window_start=case when seo.operator_attempts.window_start<now()-interval '15 minutes' then now() else seo.operator_attempts.window_start end returning attempts`;
  if(attempt.attempts>10) return NextResponse.json({error:"Troppi tentativi. Riprova tra 15 minuti."},{status:429});
  if(!validOperatorKey(input.key,secret)) return NextResponse.json({error:"Codice non valido."},{status:401});
  const res=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  res.cookies.set(OPERATOR_COOKIE,operatorToken(secret),{httpOnly:true,secure:req.nextUrl.protocol==="https:",sameSite:"strict",path:"/",maxAge:8*3600});
  return res;
}
export async function DELETE(req:NextRequest) {
  if(req.headers.get("origin")!==req.nextUrl.origin) return NextResponse.json({error:"Origine non valida."},{status:403});
  const res=NextResponse.json({ok:true});res.cookies.delete(OPERATOR_COOKIE);return res;
}
