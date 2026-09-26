import "server-only";
import { unstable_cache } from "next/cache";
import { getSql } from "../db";
import { queryGsc } from "../gsc";

/** Tetto di righe per richiesta dell'API Search Analytics. */
const GSC_MAX_ROWS = 25_000;

/**
 * Stessa pagina anche se Google la riporta con http/https, www o lo slash
 * finale: "http://solairgroup.it/faq/" e "https://solairgroup.it/faq" contano uno.
 */
function pageKey(url: string): string {
  try {
    const { hostname, pathname, search } = new URL(url);
    return `${hostname.replace(/^www\./, "")}${pathname.replace(/\/+$/, "")}${search}`;
  } catch {
    return url;
  }
}

/**
 * Pagine con almeno un'impressione su Google tra due date incluse. L'API di
 * Search Console non espone il conteggio dell'indice, quindi questa è la
 * misura più vicina disponibile: una pagina che compare nei risultati è
 * indicizzata. Letta dal vivo e tenuta in cache per 12 ore.
 */
export const getIndexedPages = unstable_cache(
  async (siteId: string, from: string, to: string): Promise<number> => {
    const [site] = await getSql()<{ gsc_property: string }[]>`
      select gsc_property from seo.sites where id = ${siteId}
    `;
    if (!site) throw new Error(`Sito ${siteId} non configurato.`);
    const rows = await queryGsc(site.gsc_property, {
      startDate: from,
      endDate: to,
      dimension: "page",
      rowLimit: GSC_MAX_ROWS,
    });
    const pages = rows.filter((row) => row.impressions > 0).map((row) => pageKey(row.key));
    return new Set(pages).size;
  },
  ["gsc-indexed-pages-v2"],
  { revalidate: 12 * 60 * 60 }
);
