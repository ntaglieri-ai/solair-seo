import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { scanOnPage } from "../onpage-scan";
import { computeSeoScore } from "../seo-score";

export type CrawlPage = {
  url: string;
  status: number | null;
  score: number | null;
  issues: string[];
  title: string;
  description: string;
  canonical: string;
  noindex: boolean;
};

type CrawlResult = { pages: CrawlPage[]; limitations: string[]; sitemapFound: boolean; complete: boolean };
type Dependencies = {
  fetch: typeof fetch;
  resolve: (hostname: string) => Promise<string[]>;
};

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_SITEMAPS = 5;
const TIMEOUT_MS = 8_000;
const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24],
  ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(address, prefix, "ipv4");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");

function publicAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4 ? !blocked.check(address, "ipv4")
    : family === 6 && globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

function hostKey(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}

function pageKey(url: URL): string {
  return `${hostKey(url)}${url.pathname}${url.search}`;
}

function allowedUrl(raw: string, base: URL): URL | null {
  try {
    const url = new URL(raw, base);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.port ||
        hostKey(url) !== hostKey(base)) return null;
    const host = url.hostname.replace(/\.$/, "");
    if (isIP(host.replace(/^\[|\]$/g, "")) || !host.includes(".") ||
        /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function pagePath(url: URL, sitemap = false): boolean {
  let path: string;
  try { path = decodeURIComponent(url.pathname).toLowerCase(); } catch { return false; }
  if (!sitemap && /\.xml\/?$/.test(path)) return false;
  return !/(?:^|\/)(?:api|graphql|wp-json|_next|assets|static|images?|img|media|uploads)(?:\/|$)/.test(path) &&
    !/\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp|pdf|zip|gz|rar|7z|mp[34]|wav|ogg|webm|mov|css|[cm]?js|map|json|txt|woff2?|ttf|eot|otf|webmanifest)(?:\/)?$/.test(path);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Errore di rete";
}

/** Injection keeps network/DNS tests offline; production always uses the defaults. */
export function createSiteCrawler(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    fetch: (...args) => fetch(...args),
    resolve: async (hostname) => (await lookup(hostname, { all: true })).map((entry) => entry.address),
    ...overrides,
  };

  return async function crawl(homeUrl: string, maxPages: number): Promise<CrawlResult> {
    const limitations = new Set<string>(["Analisi del solo HTML del server, senza esecuzione JavaScript; punteggio solo on-page, senza verifica GSC o dell'indicizzazione."]);
    const pages: CrawlPage[] = [];
    let sitemapFound = false;
    // Completion tracks coverage failures, independently of methodological notes and SEO findings.
    let complete = true;
    function recordIncomplete(limitation: string) {
      complete = false;
      limitations.add(limitation);
    }
    let base: URL;
    try { base = new URL(homeUrl); } catch {
      return { pages, limitations: [...limitations, "URL del sito non valido."], sitemapFound, complete: false };
    }
    const home = allowedUrl(homeUrl, base);
    if (!home) return { pages, limitations: [...limitations, "URL del sito non consentito: richiesto un dominio pubblico HTTP(S)."], sitemapFound, complete: false };
    const limit = Number.isNaN(maxPages) ? 1 : Math.min(50, Math.max(1, Math.floor(maxPages)));
    if (!Number.isFinite(maxPages) || maxPages !== limit) limitations.add(`Limite pagine normalizzato a ${limit} (massimo 50, homepage sempre inclusa).`);

    async function download(start: URL, sitemap: boolean) {
      const controller = new AbortController();
      let lastStatus: number | null = null;
      let timer: ReturnType<typeof setTimeout>;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("Timeout di 8 secondi")); }, TIMEOUT_MS);
      });
      const work = async () => {
        let url = start;
        const visited = new Set<string>();
        for (let hop = 0; hop <= 5; hop++) {
          if (controller.signal.aborted) throw new Error("Timeout di 8 secondi");
          const safe = allowedUrl(url.href, base);
          if (!safe || (!pagePath(safe, sitemap) && safe.href !== home!.href)) throw new Error("Destinazione o redirect non consentito");
          if (visited.has(safe.href)) throw new Error("Ciclo di redirect");
          visited.add(safe.href);
          const addresses = await deps.resolve(safe.hostname);
          if (!addresses.length || addresses.some((address) => !publicAddress(address))) throw new Error("Indirizzo privato o riservato non consentito");
          if (controller.signal.aborted) throw new Error("Timeout di 8 secondi");
          const response = await deps.fetch(safe.href, {
            redirect: "manual", signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; MosTagAuditBot/1.0)", Accept: sitemap ? "application/xml,text/xml" : "text/html,application/xhtml+xml" },
          });
          lastStatus = response.status;
          if (REDIRECTS.has(response.status)) {
            await response.body?.cancel();
            const location = response.headers.get("location");
            const next = location && allowedUrl(new URL(location, safe).href, base);
            if (!next) throw new Error("Redirect esterno o non consentito");
            if (hop === 5) throw new Error("Limite di 5 redirect raggiunto");
            url = next;
            continue;
          }
          if (Number(response.headers.get("content-length")) > MAX_BYTES) {
            await response.body?.cancel();
            throw new Error("Risposta oltre 2 MiB: lettura troncata e contenuto non analizzato");
          }
          const reader = response.body?.getReader();
          const cancelReader = () => { if (reader) void reader.cancel().catch(() => {}); };
          controller.signal.addEventListener("abort", cancelReader, { once: true });
          const decoder = new TextDecoder();
          let body = "";
          let bytes = 0;
          try {
            while (reader) {
              const { done, value } = await reader.read();
              if (done) break;
              bytes += value.byteLength;
              if (bytes > MAX_BYTES) throw new Error("Risposta oltre 2 MiB: lettura troncata e contenuto non analizzato");
              body += decoder.decode(value, { stream: true });
            }
            body += decoder.decode();
          } finally {
            controller.signal.removeEventListener("abort", cancelReader);
            if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock(); }
          }
          return { url: safe.href, status: response.status, headers: response.headers, body };
        }
        throw new Error("Limite redirect raggiunto");
      };
      try { return await Promise.race([work(), timeout]); }
      catch (error) {
        controller.abort();
        throw Object.assign(new Error(message(error)), { status: lastStatus });
      } finally { clearTimeout(timer!); }
    }

    async function scan(url: URL): Promise<CrawlPage> {
      const page: CrawlPage = { url: url.href, status: null, score: null, issues: [], title: "", description: "", canonical: "", noindex: false };
      try {
        const result = await download(url, false);
        page.url = result.url;
        page.status = result.status;
        if (result.status !== 200) page.issues.push(`HTTP ${result.status} (diverso da 200)`);
        const type = result.headers.get("content-type") ?? "";
        if (type && !/^(?:text\/html|application\/xhtml\+xml)(?:;|$)/i.test(type)) {
          complete = false;
          page.issues.push("Risposta non HTML: metadati non analizzati");
          return page;
        }
        const $ = cheerio.load(result.body);
        const directives = [result.headers.get("x-robots-tag") ?? ""];
        $("meta[name]").each((_, element) => {
          const name = ($(element).attr("name") ?? "").toLowerCase();
          if (name === "robots" || name === "googlebot") directives.push($(element).attr("content") ?? "");
        });
        page.noindex = directives.some((value) => /(?:^|[\s,:;])(?:noindex|none)(?:$|[\s,;])/i.test(value));
        if (page.noindex) page.issues.push("Noindex presente (meta robots o X-Robots-Tag)");
        const onpage = await scanOnPage(result.url, result.body);
        onpage.metaDescription = onpage.metaDescription.trim();
        onpage.metaDescriptionLength = onpage.metaDescription.length;
        onpage.canonical = onpage.canonical.trim();
        const scored = computeSeoScore(onpage, true); // Exclude GSC deductions; this does not assert GSC availability.
        page.title = onpage.title;
        page.description = onpage.metaDescription;
        page.canonical = onpage.canonical;
        page.score = scored.score;
        page.issues.push(...scored.deductions);
      } catch (error) {
        if (error && typeof error === "object" && "status" in error) page.status = error.status as number | null;
        if (page.status !== null && page.status !== 200) page.issues.push(`HTTP ${page.status} (diverso da 200)`);
        page.issues.push(message(error));
        recordIncomplete(`${url.href}: ${message(error)}`);
      }
      return page;
    }

    // The homepage is mandatory, even when the sitemap is absent or the budget is zero.
    pages.push(await scan(home));
    const candidates = new Map<string, URL>();
    const seenPages = new Set([pageKey(home), pageKey(new URL(pages[0].url))]);
    const pending = [new URL("/sitemap.xml", home)];
    const seenMaps = new Set<string>();
    let excluded = false;
    while (pending.length && seenMaps.size < MAX_SITEMAPS) {
      const url = pending.shift()!;
      if (seenMaps.has(pageKey(url))) continue;
      seenMaps.add(pageKey(url));
      try {
        const result = await download(url, true);
        if (result.status !== 200) { recordIncomplete(`Sitemap non disponibile: ${url.href} (HTTP ${result.status}); nessuna conclusione sull'indicizzazione.`); continue; }
        const $ = cheerio.load(result.body, { xmlMode: true });
        const root = $.root().children().first();
        const rootName = root.get(0)?.tagName?.split(":").pop();
        if (rootName !== "urlset" && rootName !== "sitemapindex") { recordIncomplete(`Sitemap non valida: ${url.href}`); continue; }
        sitemapFound = true;
        let entries = 0;
        root.children().each((_, entry) => {
          const name = entry.tagName?.split(":").pop();
          if (name !== (rootName === "urlset" ? "url" : "sitemap")) return;
          const loc = $(entry).children().filter((_, child) => child.tagName?.split(":").pop() === "loc").first().text().trim();
          if (!loc) { excluded = true; return; }
          entries++;
          const target = allowedUrl(loc, new URL(result.url));
          if (!target || !pagePath(target, rootName === "sitemapindex")) { excluded = true; return; }
          if (rootName === "sitemapindex") {
            if (!seenMaps.has(pageKey(target)) && !pending.some((item) => pageKey(item) === pageKey(target))) {
              // Retain only enough pending documents to establish that truncation occurred.
              if (pending.length < MAX_SITEMAPS) pending.push(target);
              else recordIncomplete("Sitemap troncate: limite di 5 documenti raggiunto.");
            }
          } else if (pagePath(target)) {
            const key = pageKey(target);
            if (seenPages.has(key) || candidates.has(key)) return;
            if (candidates.size < limit - 1) candidates.set(key, target);
            else recordIncomplete(`Scansione troncata: limite di ${limit} pagine raggiunto.`);
          } else excluded = true;
        });
        if (!entries) recordIncomplete(`Sitemap vuota: ${url.href}; nessuna conclusione sull'indicizzazione.`);
      } catch (error) { recordIncomplete(`Sitemap ${url.href}: ${message(error)}`); }
    }
    if (pending.length) recordIncomplete("Sitemap troncate: limite di 5 documenti raggiunto.");
    if (excluded) recordIncomplete("URL esterni, non consentiti o relativi ad API/risorse esclusi dalla sitemap.");
    const urls = [...candidates.values()];
    const scanned: CrawlPage[] = new Array(urls.length);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(3, urls.length) }, async () => {
      while (cursor < urls.length) { const index = cursor++; scanned[index] = await scan(urls[index]); }
    }));
    pages.push(...scanned);
    const titles = new Map<string, CrawlPage[]>();
    for (const page of pages) {
      const key = page.title.replace(/\s+/g, " ").trim().toLowerCase();
      if (key) titles.set(key, [...(titles.get(key) ?? []), page]);
    }
    for (const group of titles.values()) {
      if (new Set(group.map((page) => pageKey(new URL(page.url)))).size > 1) {
        for (const page of group) page.issues.push(`Title duplicato tra ${group.length} pagine scansionate`);
      }
    }
    return { pages, limitations: [...limitations], sitemapFound, complete };
  };
}

export const crawlSite = createSiteCrawler();
