import { NextRequest, NextResponse } from "next/server";
import { authorizedEngine } from "../../../lib/engine/auth";
import { getSite } from "../../../lib/engine/collect";
import { getEngineSettings, getLastSnapshot, updateEngineSettings } from "../../../lib/engine/store";
import { getLatestAttempts } from "../../../lib/engine/read";
import { runEngine } from "../../../lib/engine/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  if (!authorizedEngine(request)) return NextResponse.json({ error: "Non autorizzato." }, { status: 401, headers: noStore });
  const siteId = request.nextUrl.searchParams.get("site") ?? "solairgroup.it";
  if (!await getSite(siteId)) return NextResponse.json({ error: "Sito non configurato." }, { status: 404 });
  try {
    const [settings, attempts, snapshot] = await Promise.all([
      getEngineSettings(siteId), getLatestAttempts(siteId), getLastSnapshot(siteId),
    ]);
    return NextResponse.json({ siteId, settings, attempts, snapshot, scheduler: "Controllo ogni giorno alle 05:00 UTC; intervalli espressi in giorni." }, { headers: noStore });
  } catch (error) {
    console.error("[engine] Lettura stato fallita", error);
    return NextResponse.json({ error: "Stato motore non disponibile." }, { status: 500, headers: noStore });
  }
}

async function mutate(request: NextRequest, configure: boolean) {
  if (!authorizedEngine(request)) return NextResponse.json({ error: "Non autorizzato." }, { status: 401, headers: noStore });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON non valido." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  const allowed = configure ? ["siteId", "settings"] : ["siteId", "force"];
  if (Object.keys(body).some((key) => !allowed.includes(key)) ||
      (body.siteId !== undefined && typeof body.siteId !== "string") ||
      (!configure && body.force !== undefined && typeof body.force !== "boolean")) {
    return NextResponse.json({ error: "Parametri non validi." }, { status: 400 });
  }
  const site = await getSite(body.siteId ?? "solairgroup.it");
  if (!site) return NextResponse.json({ error: "Sito non configurato." }, { status: 404 });
  try {
    if (configure) {
      // Validazione prima della scrittura; nessun parametro SQL dinamico dall'utente.
      const { validateSettings } = await import("../../../lib/engine/settings");
      try { validateSettings(body.settings); }
      catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Configurazione non valida." }, { status: 400 }); }
      return NextResponse.json({ settings: await updateEngineSettings(site.id, body.settings) }, { headers: noStore });
    }
    const result = await runEngine(site, { force: body.force === true, trigger: "manual" });
    return NextResponse.json(result, { status: result.ok ? 200 : 500, headers: noStore });
  } catch (error) {
    console.error("[engine] Operazione fallita", error);
    return NextResponse.json({ error: "Operazione motore non riuscita." }, { status: 500, headers: noStore });
  }
}

export const PATCH = (request: NextRequest) => mutate(request, true);
export const POST = (request: NextRequest) => mutate(request, false);
