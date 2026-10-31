import { NextRequest, NextResponse } from "next/server";
import { getSites } from "../../../../lib/engine/collect";
import { runEngine } from "../../../../lib/engine/run";
import { authorizedEngine } from "../../../../lib/engine/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Il cron è un dispatcher giornaliero: le frequenze per sito sono nel database.
export async function GET(request: NextRequest) {
  if (!authorizedEngine(request)) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  const raw = request.nextUrl.searchParams.get("backfill");
  const days = raw === null ? undefined : Number(raw);
  if (days !== undefined && (!Number.isInteger(days) || days < 1 || days > 486)) {
    return NextResponse.json({ error: "backfill deve essere un intero tra 1 e 486." }, { status: 400 });
  }
  try {
    const report = [];
    for (const site of await getSites()) {
      try {
        report.push(await runEngine(site, { trigger: days ? "manual" : "cron", force: !!days, backfillDays: days }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Errore motore";
        console.error("[engine] Esecuzione fallita", { site: site.id, error: message });
        report.push({ site: site.id, ok: false, error: message });
      }
    }
    const ok = report.every((entry) => entry.ok);
    return NextResponse.json({ ok, report }, { status: ok ? 200 : 500 });
  } catch (error) {
    console.error("[engine] Avvio non riuscito", error);
    return NextResponse.json({ error: "Impossibile avviare il motore." }, { status: 500 });
  }
}
