import { requireSeoApi } from "../../../lib/crm-auth";
import { NextRequest, NextResponse } from "next/server";
import { getSql } from "../../../lib/db";
import { acquireLease, releaseLease } from "../../../lib/engine/store";
import { collectPublicSite } from "../../../lib/public-collection";

export const maxDuration = 300;
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: NextRequest) {
  const denied = await requireSeoApi(request, true);
  if (denied) return denied;

  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Richiesta non consentita." }, { status: 403, headers });
  if (Number(request.headers.get("content-length")) > 1000) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400, headers });
  let raw;
  try { raw = await request.text(); } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400, headers }); }
  let body;
  try { if (raw.length > 1000) throw new Error(); body = JSON.parse(raw); }
  catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400, headers }); }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length) return NextResponse.json({ error: "Questa analisi riguarda il sito pubblico di Solair." }, { status: 400, headers });
  const site = { id: "solairgroup.it", home_url: "https://solairgroup.it/" };
  let lease: string | null = null;
  try {
    lease = await acquireLease(site.id);
    if (!lease) return NextResponse.json({ error: "Un’analisi è già in corso. Riprova tra poco." }, { status: 409, headers });
    const [recent] = await getSql()<{id:string}[]>`select id from seo.runs where site_id=${site.id} and kind='technical' and status='ok' and raw->>'channel'='public-url' and started_at>now()-interval '5 minutes' order by started_at desc limit 1`;
    if (recent) return NextResponse.json({ url: `/report/sito?audit=${recent.id}`, reused: true }, { headers });
    const result = await collectPublicSite(site, 20, "manual", "public-url");
    return NextResponse.json({ url: `/report/sito?audit=${result.runId}`, partial: !result.result.complete }, { headers });
  } catch {
    console.error("[public-audit] Raccolta del sito pubblico non riuscita.");
    return NextResponse.json({ error: "Non è stato possibile completare la lettura del sito. Le analisi archiviate restano disponibili." }, { status: 503, headers });
  } finally { if (lease) await releaseLease(site.id, lease); }
}
