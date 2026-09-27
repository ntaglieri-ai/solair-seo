import * as cheerio from "cheerio";
import { collectJsonLdTypes } from "./geo-scan";

export type OnPageData = {
  url: string;
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  canonical: string;
  h1: string[];
  h2: string[];
  imagesWithoutAlt: string[];
  internalLinks: number;
  externalLinks: number;
  schemaTypes: string[];
  ogTags: Record<string, string>;
};

/**
 * Scraping on-page via fetch + cheerio (equivalente leggero di
 * scrape_onpage() in seo_scanner.py, senza browser headless: adatto
 * a girare in una funzione serverless Vercel senza dipendenze pesanti).
 * Nota: legge l'HTML servito dal server, non esegue JavaScript client-side.
 */
export async function fetchPageHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MosTagAuditBot/1.0)",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Impossibile scaricare ${url}: HTTP ${res.status}`);
  }

  return res.text();
}

/** `html` evita un secondo download quando la pagina è già stata scaricata. */
export async function scanOnPage(url: string, html?: string): Promise<OnPageData> {
  html ??= await fetchPageHtml(url);
  const $ = cheerio.load(html);
  const domain = new URL(url).hostname;

  const title = $("title").first().text().trim();
  const metaDescription = $('meta[name="description"]').attr("content") ?? "";
  const canonical = $('link[rel="canonical"]').attr("href") ?? "";

  const h1 = $("h1")
    .map((_, el) => $(el).text().trim())
    .get();
  const h2 = $("h2")
    .map((_, el) => $(el).text().trim())
    .get()
    .slice(0, 5);

  const imagesWithoutAlt: string[] = [];
  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    if (!alt) {
      const src = $(el).attr("src") ?? "";
      imagesWithoutAlt.push(src.slice(0, 80));
    }
  });

  let internalLinks = 0;
  let externalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href.startsWith("http") && !href.includes(domain)) {
      externalLinks += 1;
    } else if (href.startsWith("/") || href.includes(domain)) {
      internalLinks += 1;
    }
  });

  // Tutti i tipi JSON-LD, anche dentro @graph e annidati: stessa lettura del controllo GEO.
  const schemaTypes = collectJsonLdTypes(html);

  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const property = $(el).attr("property");
    const content = $(el).attr("content") ?? "";
    if (property) ogTags[property] = content;
  });

  return {
    url,
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    canonical,
    h1,
    h2,
    imagesWithoutAlt: imagesWithoutAlt.slice(0, 10),
    internalLinks,
    externalLinks,
    schemaTypes,
    ogTags,
  };
}
