import { NextRequest, NextResponse } from "next/server";
import { fetchPageHtml, scanOnPage } from "../../../lib/onpage-scan";
import { scanGeo } from "../../../lib/geo-scan";
import { getGscData } from "../../../lib/gsc";
import { computeSeoScore } from "../../../lib/seo-score";
import { recordAudit } from "../../../lib/engine/collect";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Endpoint di scansione live: riceve un URL qualsiasi, esegue scraping
 * on-page + controlli GEO + query GSC (se la proprietà è verificata
 * sull'account Google collegato) + calcolo dei punteggi SEO e GEO. Pensato per uso multi-sito: la proprietà
 * GSC si deriva dal dominio richiesto, non è fissa su un solo cliente.
 *
 * Uso: GET /api/scan?url=https://esempio.it
 * Override esplicito proprietà GSC: GET /api/scan?url=...&property=sc-domain:esempio.it
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const propertyOverride = request.nextUrl.searchParams.get("property");

  if (!url) {
    return NextResponse.json(
      { error: "Parametro 'url' mancante. Uso: /api/scan?url=https://esempio.it" },
      { status: 400 }
    );
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "URL non valido." }, { status: 400 });
  }

  const siteProperty = propertyOverride || `sc-domain:${targetUrl.hostname.replace(/^www\./, "")}`;

  try {
    const html = await fetchPageHtml(targetUrl.toString());
    const [onpage, geo, gsc] = await Promise.all([
      scanOnPage(targetUrl.toString(), html),
      scanGeo(targetUrl.toString(), html),
      getGscData(siteProperty).catch((err) => {
        console.error("[scan] GSC non disponibile per questa proprieta':", err);
        return {
          keywords: [],
          pages: [],
          totalsCurrent: { clicks: 0, impressions: 0, ctr: 0 },
          totalsPrevious: { clicks: 0, impressions: 0, ctr: 0 },
          period: "N/D",
        };
      }),
    ]);

    const { score, deductions } = computeSeoScore(onpage, gsc.keywords.length > 0);
    const domain = targetUrl.hostname.replace(/^www\./, "");

    const result = {
      url: targetUrl.toString(),
      domain,
      gscProperty: siteProperty,
      scannedAt: new Date().toISOString(),
      score,
      deductions,
      geoScore: geo.score,
      onpage,
      geo,
      gsc,
    };

    // Archivia l'audit se il dominio è monitorato. Un errore del database
    // non deve impedire di mostrare il risultato.
    let runId: string | null = null;
    try {
      runId = await recordAudit(domain, { onpage, score, deductions, raw: result });
    } catch (err) {
      console.error("[scan] Audit non archiviato:", err);
    }

    return NextResponse.json({ ...result, runId });
  } catch (err) {
    console.error("[scan] Errore durante la scansione:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore sconosciuto durante la scansione." },
      { status: 500 }
    );
  }
}
