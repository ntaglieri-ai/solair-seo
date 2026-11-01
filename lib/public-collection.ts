import "server-only";
import { crawlSite, PUBLIC_CRAWL_VERSION } from "./engine/crawl";
import { withRun, type Site, type Trigger } from "./engine/collect";
import { analyzePublicUrl } from "./url-audit";

/** Shared by standalone URL runs and the detailed engine; never calls account APIs. */
export async function collectPublicSite(site: Pick<Site, "id" | "home_url">, maxPages: number, trigger: Trigger, channel = "engine") {
  return withRun(site.id, "technical", trigger, async (runId, tx) => {
    const crawl = await crawlSite(site.home_url, maxPages);
    if (!crawl.pages.length) throw new Error("Nessuna pagina raccolta dal sito pubblico.");
    const data = { ...crawl, version: PUBLIC_CRAWL_VERSION, maxPages, publicAnalysis: analyzePublicUrl(crawl) };
    await tx`insert into seo.technical_batches(run_id,site_id,data) values (${runId},${site.id},${tx.json(data)})`;
    return { result: { pages: data.pages.length, limitations: data.limitations, complete: data.publicAnalysis.scope.complete, findings: data.publicAnalysis.findings.length }, raw: { channel, version: data.version, pages: data.pages.length } };
  });
}
