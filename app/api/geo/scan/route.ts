import { NextRequest, NextResponse } from "next/server";
import { authorizedEngine } from "../../../../lib/engine/auth";
import { OPERATOR_COOKIE, validOperatorToken } from "../../../../lib/operator";
import { runGeoScan } from "../../../../lib/geo/run-scan";

export const dynamic = "force-dynamic";
export const maxDuration = 180;
const headers = { "Cache-Control": "no-store" };

/** Avvio manuale della scansione di livello 2: solo operatore (stessa origine) o motore con CRON_SECRET. */
export async function POST(request: NextRequest) {
  const machine = authorizedEngine(request);
  const operator = validOperatorToken(request.cookies.get(OPERATOR_COOKIE)?.value, process.env.CRON_SECRET);
  if (!machine && (!operator || request.headers.get("origin") !== request.nextUrl.origin)) {
    return NextResponse.json({ error: "Accedi alla gestione per avviare la scansione." }, { status: 401, headers });
  }
  try {
    const raw = await request.text();
    if (raw.length > 1000) throw new Error();
    const body = raw ? JSON.parse(raw) : {};
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length) throw new Error();
  } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400, headers }); }
  try {
    const result = await runGeoScan("solairgroup.it", "manual");
    const blocked = {
      disabled: [503, "Scansione GEO non attivata per questo sito."],
      not_configured: [503, "Consumi a pagamento non configurati."],
      already_running: [409, "È già in corso una scansione. Attendi e riprova."],
      not_due: [200, "Non in scadenza."],
    } as const;
    if (result.status in blocked) {
      const [status, error] = blocked[result.status as keyof typeof blocked];
      return NextResponse.json({ status: result.status, error }, { status, headers });
    }
    return NextResponse.json(result, { headers });
  } catch {
    console.error("[geo-scan] Scansione non completata; nessun dettaglio del provider registrato.");
    return NextResponse.json({ error: "Impossibile completare la scansione. I risultati precedenti restano disponibili." }, { status: 503, headers });
  }
}
