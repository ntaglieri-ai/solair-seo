import { requireSeoApi, canWriteSeo } from "../../../../lib/crm-auth";
import { NextRequest, NextResponse } from "next/server";
import { parseGeoSettings } from "../../../../lib/geo/settings";
import { saveGeoSettings } from "../../../../lib/geo/store";
export const dynamic = "force-dynamic";
export async function PATCH(request: NextRequest) {
  const denied = await requireSeoApi(request, true);
  if (denied) return denied;

  const headers = { "Cache-Control": "no-store" };
  if (request.headers.get("origin") !== request.nextUrl.origin || !await canWriteSeo())
    return NextResponse.json({ error: "Accedi alla gestione per salvare le impostazioni." }, { status: 401, headers });
  let input;
  try {
    const raw = await request.text();
    if (raw.length > 1000) throw new Error("Richiesta troppo grande.");
    input = parseGeoSettings(JSON.parse(raw));
  } catch { return NextResponse.json({ error: "Scegli una frequenza valida e budget tra 0 e 100 USD. Il limite per analisi non può superare quello mensile." }, { status: 400, headers }); }
  try {
    await saveGeoSettings("solairgroup.it", input);
    return NextResponse.json({ ok: true }, { headers });
  } catch { return NextResponse.json({ error: "Impostazioni non salvate. Riprova tra poco." }, { status: 503, headers }); }
}
