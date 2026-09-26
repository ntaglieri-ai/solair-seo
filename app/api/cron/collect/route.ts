import { NextRequest, NextResponse } from "next/server";
import { collectGa4, collectGsc, collectOnPage, getSites, isOnPageDue } from "../../../../lib/engine/collect";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Massimo storico disponibile in Search Console: 16 mesi. */
const MAX_BACKFILL_DAYS = 486;

/**
 * Raccolta automatica, chiamata ogni giorno dal cron di Vercel.
 * Per ogni sito: aggiorna Search Console e GA4 e, se è passata una settimana,
 * rifà l'analisi on-page della home.
 *
 * Protetta da CRON_SECRET (Vercel lo invia come header Authorization).
 * Recupero dello storico: GET /api/cron/collect?backfill=486
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const backfill = Number(request.nextUrl.searchParams.get("backfill"));
  const days = Number.isInteger(backfill) && backfill > 0 ? Math.min(backfill, MAX_BACKFILL_DAYS) : undefined;
  const trigger = days ? "manual" : "cron";

  const report = [];
  for (const site of await getSites()) {
    const entry: Record<string, unknown> = { site: site.id };

    try {
      entry.gsc = (await collectGsc(site, trigger, days)).result;
    } catch (err) {
      entry.gsc = { error: err instanceof Error ? err.message : String(err) };
    }

    try {
      const ga4 = await collectGa4(site, trigger, days);
      entry.ga4 = ga4 ? ga4.result : "proprietà non configurata";
    } catch (err) {
      entry.ga4 = { error: err instanceof Error ? err.message : String(err) };
    }

    try {
      if (await isOnPageDue(site.id)) {
        entry.onpage = (await collectOnPage(site, trigger)).result;
      } else {
        entry.onpage = "non dovuta";
      }
    } catch (err) {
      entry.onpage = { error: err instanceof Error ? err.message : String(err) };
    }

    report.push(entry);
  }

  const failed = report.some((entry) =>
    [entry.gsc, entry.ga4, entry.onpage].some((value) => typeof value === "object" && value !== null && "error" in value)
  );
  return NextResponse.json({ ok: !failed, report }, { status: failed ? 500 : 200 });
}
