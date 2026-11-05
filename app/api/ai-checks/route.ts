import { NextRequest, NextResponse } from "next/server";
import { collectAiChecks } from "../../../lib/ai-collection";
import { authorizedEngine } from "../../../lib/engine/auth";
import { OPERATOR_COOKIE, validOperatorToken } from "../../../lib/operator";

export const dynamic = "force-dynamic";
export const maxDuration = 180;
const headers = { "Cache-Control": "no-store" };
export async function POST(request: NextRequest) {
  const machine = authorizedEngine(request);
  const operator = validOperatorToken(request.cookies.get(OPERATOR_COOKIE)?.value, process.env.CRON_SECRET);
  if (!machine && (!operator || request.headers.get("origin") !== request.nextUrl.origin)) return NextResponse.json({ error: "Accedi alla gestione fonti per avviare la verifica AI." }, { status: 401, headers });
  try {
    if (Number(request.headers.get("content-length")) > 1000) throw new Error();
    const raw = await request.text();
    if (raw.length > 1000) throw new Error();
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length) throw new Error();
  } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400, headers }); }
  try {
    const result = await collectAiChecks("solairgroup.it", "manual");
    const blocked = {
      not_configured: "Collegamento Gemini non ancora attivo.", disabled: "Automazione disattivata.",
      already_running: "È già in corso una raccolta. Attendi e riprova.",
      cooldown: "Una verifica è già stata richiesta negli ultimi 15 minuti. Consulta l’ultima rilevazione.",
      daily_limit: "Raggiunto il limite di sei raccolte AI al giorno. Riprova domani.",
    };
    if (result.status in blocked) return NextResponse.json({ error: blocked[result.status as keyof typeof blocked] }, {
      status: result.status === "cooldown" || result.status === "daily_limit" ? 429 : result.status === "already_running" ? 409 : 503, headers });
    return NextResponse.json(result, { headers });
  } catch {
    console.error("[ai-checks] Raccolta non completata; nessun dettaglio del provider registrato.");
    return NextResponse.json({ error: "Impossibile completare la raccolta AI. Le verifiche precedenti restano disponibili." }, { status: 503, headers });
  }
}
