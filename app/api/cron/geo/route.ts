import { NextRequest, NextResponse } from "next/server";
import { authorizedEngine } from "../../../../lib/engine/auth";
import { runGeoScan } from "../../../../lib/geo/run-scan";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const headers = { "Cache-Control": "no-store" };

/**
 * Passaggio giornaliero: la scansione parte solo se il sito ha GEO attivo e la sua frequenza è scaduta
 * (o se una scansione aperta va ripresa). Con frequenza "manual" non parte mai da qui.
 */
export async function GET(request: NextRequest) {
  if (!authorizedEngine(request)) return NextResponse.json({ error: "Non autorizzato." }, { status: 401, headers });
  try {
    const deadline = Date.now() + 270_000;
    let result = await runGeoScan("solairgroup.it", "scheduled", { deadline });
    // Completa più lotti nello stesso passaggio giornaliero, nei limiti della funzione.
    while (result.status === "in_progress" && Date.now() < deadline - 70_000) {
      result = await runGeoScan("solairgroup.it", "scheduled", { deadline });
    }
    return NextResponse.json(result, { status: result.status === "failed" ? 503 : 200, headers });
  } catch {
    console.error("[cron-geo] Scansione non completata; nessun dettaglio del provider registrato.");
    return NextResponse.json({ error: "Scansione GEO non disponibile." }, { status: 503, headers });
  }
}
