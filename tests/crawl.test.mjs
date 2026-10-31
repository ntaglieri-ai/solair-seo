import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

// Compile in memory: keep the repository's extensionless TS imports and add no dependencies/artifacts.
const require = createRequire(import.meta.url);
const previous = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
};
const { createSiteCrawler, crawlSite } = require("../lib/engine/crawl.ts");
if (previous) require.extensions[".ts"] = previous;
else delete require.extensions[".ts"];

const origin = "https://example.com";
const html = (title = "A useful page title with enough text") => `<html><head><title>${title}</title><meta name="description" content="${"Description ".repeat(12).trim()}"><link rel="canonical" href="${origin}/"><script type="application/ld+json">{"@type":"Organization"}</script></head><body><h1>Heading</h1></body></html>`;
const xml = (paths) => `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${path.startsWith("/") ? origin + path : path}</loc></url>`).join("")}</urlset>`;
const index = (paths) => `<sitemapindex>${paths.map((path) => `<sitemap><loc>${origin}${path}</loc></sitemap>`).join("")}</sitemapindex>`;
const response = (body, status = 200, headers = {}) => new Response(body, {
  status, headers: { ...(typeof body === "string" && body.startsWith("<") ? { "content-type": "text/html" } : {}), ...headers },
});
function fixture(routes = {}, overrides = {}) {
  const calls = [];
  const crawl = createSiteCrawler({
    resolve: async () => ["93.184.216.34"],
    fetch: async (url, options) => {
      calls.push(url);
      assert.equal(options.redirect, "manual");
      assert.ok(options.signal instanceof AbortSignal);
      const route = routes[url] ?? routes[new URL(url).pathname];
      return typeof route === "function" ? route(url, options) : route ? response(...route) : response("missing", 404);
    },
    ...overrides,
  });
  return { crawl, calls };
}

test("exports production crawler and scores homepage without a GSC deduction", async () => {
  assert.equal(typeof crawlSite, "function");
  const { crawl, calls } = fixture({ "/": [html()], "/sitemap.xml": [xml(["/", "/about"])] , "/about": [html("Another useful title with enough text")] });
  const result = await crawl(origin, 10);
  assert.equal(result.sitemapFound, true);
  assert.equal(result.complete, true);
  assert.equal(result.pages.length, 2);
  assert.equal(result.pages[0].score, 100);
  assert.deepEqual(result.pages[0].issues, []);
  assert.equal(calls.filter((url) => url === origin + "/").length, 1);
  assert.match(result.limitations.join(" "), /senza esecuzione JavaScript/);
});

test("XML namespaces, nested sitemap, CDATA, entities and www variants", async () => {
  const { crawl, calls } = fixture({
    "/": [html()],
    "/sitemap.xml": ['<s:sitemapindex xmlns:s="urn:sitemap"><s:sitemap><s:loc>/nested.xml</s:loc></s:sitemap></s:sitemapindex>'],
    "/nested.xml": ['<s:urlset xmlns:s="urn:sitemap" xmlns:image="urn:image"><s:url><s:loc><![CDATA[https://www.example.com/about?a=1&b=2]]></s:loc><image:loc>https://evil.com/image.png</image:loc></s:url><s:url><s:loc>https://example.com/contact?a=1&amp;b=2</s:loc></s:url></s:urlset>'],
    "/about": [html()], "/contact": [html()],
  });
  const result = await crawl(origin, 10);
  assert.equal(result.pages.length, 3);
  assert.equal(result.complete, true);
  assert.ok(calls.includes("https://www.example.com/about?a=1&b=2"));
  assert.ok(calls.includes(origin + "/contact?a=1&b=2"));
  assert.ok(!calls.some((url) => url.includes("evil")));
});

test("homepage remains mandatory for zero budget; invalid budgets stay bounded", async () => {
  for (const max of [0, -5, NaN, 1.8]) {
    const { crawl } = fixture({ "/": [html()], "/sitemap.xml": [xml(["/other"])] });
    const result = await crawl(origin, max);
    assert.equal(result.pages.length, 1);
    assert.equal(result.complete, false);
    assert.equal(result.pages[0].url, origin + "/");
    assert.match(result.limitations.join(" "), /limite di 1 pagine/i);
  }
});

test("caps pages at 50, deduplicates fragments/www, and reports truncation", async () => {
  const { crawl, calls } = fixture({
    "/": [html()],
    "/sitemap.xml": [xml(["/", "https://www.example.com/#top", ...Array.from({ length: 70 }, (_, i) => `/page-${i}`)])],
    ...Object.fromEntries(Array.from({ length: 70 }, (_, i) => [`/page-${i}`, [html()]])),
  });
  const result = await crawl(origin, Infinity);
  assert.equal(result.pages.length, 50);
  assert.equal(result.complete, false);
  assert.equal(calls.length, 51);
  assert.match(result.limitations.join(" "), /limite di 50 pagine/);
});

test("caps sitemap documents at five, detects cycles, and reports truncation", async () => {
  const routes = { "/": [html()], "/sitemap.xml": [index(["/sitemap.xml", ...Array.from({ length: 8 }, (_, i) => `/s${i}.xml`)])] };
  for (let i = 0; i < 8; i++) {
    routes[`/s${i}.xml`] = [xml([`/p${i}`])];
    routes[`/p${i}`] = [html()];
  }
  const { crawl, calls } = fixture(routes);
  const result = await crawl(origin, 50);
  assert.equal(calls.filter((url) => url.endsWith(".xml")).length, 5);
  assert.equal(result.complete, false);
  assert.match(result.limitations.join(" "), /limite di 5 documenti/);
  assert.equal(result.pages.length, 5);
});

test("missing, empty and non-sitemap XML do not imply deindexing", async () => {
  for (const route of [["not found", 404], [xml([])], ["<html><body>Error</body></html>"]]) {
    const { crawl } = fixture({ "/": [html()], "/sitemap.xml": route });
    const result = await crawl(origin, 10);
    assert.equal(result.pages.length, 1);
    assert.equal(result.complete, false);
    assert.equal(result.sitemapFound, route[0].startsWith("<urlset"));
    assert.ok(!result.pages[0].issues.some((issue) => /indic|redirect/i.test(issue)));
  }
});

test("reports missing metadata, noindex, non-200 and duplicate titles", async () => {
  const body = '<title>Repeated title</title><META NAME="ROBOTS" CONTENT="NOINDEX, follow">';
  const { crawl } = fixture({
    "/": [body], "/sitemap.xml": [xml(["/missing"])],
    "/missing": ["<title>Repeated title</title>", 404, { "x-robots-tag": "googlebot: noindex" }],
  });
  const { pages, complete } = await crawl(origin, 10);
  assert.equal(complete, true);
  for (const page of pages) {
    assert.equal(page.noindex, true);
    assert.match(page.issues.join(" "), /Noindex/);
    assert.match(page.issues.join(" "), /Meta description mancante/);
    assert.match(page.issues.join(" "), /Canonical mancante/);
    assert.match(page.issues.join(" "), /Title duplicato/);
    assert.ok(!page.issues.some((issue) => /GSC|redirect/i.test(issue)));
  }
  assert.equal(pages[1].status, 404);
  assert.match(pages[1].issues.join(" "), /HTTP 404/);
});

test("skips arbitrary external domains, credentials, ports, assets and API paths", async () => {
  const paths = ["https://evil.com/a", "https://example.com.evil.com/a", "https://sub.example.com/a", "http://127.0.0.1/a", "http://[::1]/", "http://2130706433/", "file:///etc/passwd", "https://user:pass@example.com/a", "https://example.com:8080/a", "/api/a", "/%61pi/a", "/images/a", "/assets/a", "/a.jpg", "/a.pdf", "/a.js", "/a.json", "/about"];
  const { crawl, calls } = fixture({ "/": [html()], "/sitemap.xml": [xml(paths)], "/about": [html()] });
  const result = await crawl(origin, 50);
  assert.equal(result.pages.length, 2);
  assert.equal(result.complete, false);
  assert.deepEqual(calls, [origin + "/", origin + "/sitemap.xml", origin + "/about"]);
});

test("redirects are manual and restricted to the site and www variant", async () => {
  const { crawl, calls } = fixture({
    "/": ["", 301, { location: "https://www.example.com/home" }],
    "/home": [html()], "/sitemap.xml": [xml(["/bad", "/private", "/asset", "/loop"])],
    "/bad": ["", 302, { location: "https://evil.com/" }],
    "/private": ["", 302, { location: "http://127.0.0.1/" }],
    "/asset": ["", 302, { location: "/images/a.png" }],
    "/loop": ["", 302, { location: "/loop" }],
  });
  const { pages } = await crawl(origin, 10);
  assert.equal(pages[0].url, "https://www.example.com/home");
  assert.equal(pages[0].score, 100);
  assert.ok(calls.every((url) => ["example.com", "www.example.com"].includes(new URL(url).hostname)));
  assert.ok(!calls.some((url) => url.includes("images")));
  assert.ok(pages.slice(1).every((page) => page.score === null && page.status === 302));
});

test("private and mixed DNS answers are rejected before fetching", async () => {
  for (const addresses of [["127.0.0.1"], ["10.0.0.2"], ["169.254.169.254"], ["::1"], ["fc00::1"], ["::ffff:127.0.0.1"], ["93.184.216.34", "192.168.1.1"]]) {
    let fetched = false;
    const crawl = createSiteCrawler({ resolve: async () => addresses, fetch: async () => { fetched = true; throw Error("must not fetch"); } });
    const result = await crawl(origin, 10);
    assert.equal(fetched, false);
    assert.equal(result.pages[0].status, null);
    assert.match(result.pages[0].issues.join(" "), /privato/);
  }
});

test("revalidates DNS for the www redirect target", async () => {
  const { crawl, calls } = fixture({ "/": ["", 302, { location: "https://www.example.com/" }] }, {
    resolve: async (hostname) => [hostname.startsWith("www.") ? "10.0.0.1" : "93.184.216.34"],
  });
  const result = await crawl(origin, 1);
  assert.ok(!calls.some((url) => url.includes("www.")));
  assert.match(result.pages[0].issues.join(" "), /privato/);
});

test("invalid and private homepage URLs make no network requests", async () => {
  for (const home of ["bad url", "file:///tmp/test", "http://localhost/", "http://127.1/", "http://[::1]/", "http://service.local/", "https://user:pass@example.com/"]) {
    const { crawl, calls } = fixture();
    const result = await crawl(home, 10);
    assert.equal(result.pages.length, 0);
    assert.equal(result.complete, false);
    assert.equal(calls.length, 0);
  }
});

test("caps streaming bytes and Content-Length without scoring partial HTML", async () => {
  for (const oversized of [
    () => response(html(), 200, { "content-length": String(2 * 1024 * 1024 + 1) }),
    () => response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(1024 * 1024)); controller.enqueue(new Uint8Array(1024 * 1024 + 1)); controller.close(); } })),
  ]) {
    const { crawl } = fixture({ "/": oversized });
    const result = await crawl(origin, 1);
    assert.equal(result.pages[0].status, 200);
    assert.equal(result.pages[0].score, null);
    assert.match(result.limitations.join(" "), /2 MiB.*troncata/);
  }
});

test("page workers never exceed concurrency three and retain sitemap order", async () => {
  let active = 0;
  let peak = 0;
  const routes = { "/": [html()], "/sitemap.xml": [xml(Array.from({ length: 9 }, (_, i) => `/p${i}`))] };
  for (let i = 0; i < 9; i++) routes[`/p${i}`] = async () => {
    peak = Math.max(peak, ++active);
    await new Promise((resolve) => setTimeout(resolve, 10 - i));
    active--;
    return response(html());
  };
  const { crawl } = fixture(routes);
  const result = await crawl(origin, 10);
  assert.equal(peak, 3);
  assert.deepEqual(result.pages.slice(1).map((page) => new URL(page.url).pathname), Array.from({ length: 9 }, (_, i) => `/p${i}`));
});

test("deadline covers an uncooperative fetch and aborts its signal", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let signal;
  const { crawl } = fixture({
    "/": async (_url, options) => { signal = options.signal; return new Promise(() => {}); },
    "/sitemap.xml": [xml([])],
  });
  const pending = crawl(origin, 1);
  // Let the resolver and request start before advancing the clock.
  for (let i = 0; i < 5; i++) await Promise.resolve();
  context.mock.timers.tick(8_000);
  const result = await pending;
  assert.equal(signal.aborted, true);
  assert.equal(result.pages[0].status, null);
  assert.match(result.pages[0].issues.join(" "), /Timeout di 8 secondi/);
});

test("non-HTML responses and network failures stay explicit with null scores", async () => {
  const { crawl } = fixture({
    "/": [html()], "/sitemap.xml": [xml(["/data", "/offline"])],
    "/data": ["not HTML", 200, { "content-type": "application/json" }],
    "/offline": () => { throw new Error("Network unavailable"); },
  });
  const { pages } = await crawl(origin, 10);
  assert.equal(pages[1].score, null);
  assert.match(pages[1].issues.join(" "), /non HTML/);
  assert.equal(pages[2].status, null);
  assert.match(pages[2].issues.join(" "), /Network unavailable/);
});

test("deadline covers stalled DNS without starting a later fetch", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let resolveDns;
  let calls = 0;
  let lookups = 0;
  const crawl = createSiteCrawler({
    resolve: () => ++lookups === 1 ? new Promise((resolve) => { resolveDns = resolve; }) : Promise.resolve(["93.184.216.34"]),
    fetch: async () => { calls++; return response(xml([])); },
  });
  const pending = crawl(origin, 1);
  context.mock.timers.tick(8_000);
  const result = await pending;
  resolveDns(["93.184.216.34"]);
  for (let i = 0; i < 5; i++) await Promise.resolve();
  assert.equal(calls, 1); // Only the subsequent sitemap request.
  assert.match(result.pages[0].issues.join(" "), /Timeout/);
});

test("deadline covers stalled body reads and cancels the stream", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let cancelled = false;
  const { crawl } = fixture({
    "/": () => response(new ReadableStream({ cancel() { cancelled = true; } }), 200, { "content-type": "text/html" }),
    "/sitemap.xml": [xml([])],
  });
  const pending = crawl(origin, 1);
  for (let i = 0; i < 8; i++) await Promise.resolve();
  context.mock.timers.tick(8_000);
  const result = await pending;
  assert.equal(cancelled, true);
  assert.equal(result.pages[0].status, 200);
  assert.equal(result.pages[0].score, null);
  assert.match(result.pages[0].issues.join(" "), /Timeout/);
});

test("redirect chains stop after five hops", async () => {
  const routes = { "/": ["", 302, { location: "/r0" }], "/sitemap.xml": [xml([])] };
  for (let i = 0; i < 8; i++) routes[`/r${i}`] = ["", 302, { location: `/r${i + 1}` }];
  const { crawl, calls } = fixture(routes);
  const { pages } = await crawl(origin, 1);
  assert.equal(calls.filter((url) => !url.endsWith(".xml")).length, 6);
  assert.match(pages[0].issues.join(" "), /5 redirect/);
});

test("nested sitemap locations and redirects cannot fetch image/API resources", async () => {
  const { crawl, calls } = fixture({
    "/": [html()], "/sitemap.xml": [index(["/image.png", "/api/sitemap", "/nested.xml"])],
    "/nested.xml": ["", 302, { location: "/assets/file.xml" }],
  });
  const result = await crawl(origin, 10);
  assert.deepEqual(calls, [origin + "/", origin + "/sitemap.xml", origin + "/nested.xml"]);
  assert.equal(result.pages.length, 1);
});

test("oversized sitemap is reported without parsing partial XML", async () => {
  const { crawl } = fixture({
    "/": [html()], "/sitemap.xml": [xml(["/hidden"]), 200, { "content-length": String(2 * 1024 * 1024 + 1) }],
  });
  const result = await crawl(origin, 10);
  assert.equal(result.sitemapFound, false);
  assert.equal(result.complete, false);
  assert.equal(result.pages.length, 1);
  assert.match(result.limitations.join(" "), /Sitemap.*2 MiB/);
});

test("whitespace metadata counts as missing and robots none counts as noindex", async () => {
  const { crawl } = fixture({
    "/": ['<meta name="description" content="   "><link rel="canonical" href="   "><meta name="googlebot" content="none">'],
    "/sitemap.xml": [xml([])],
  });
  const { pages } = await crawl(origin, 1);
  assert.equal(pages[0].noindex, true);
  assert.match(pages[0].issues.join(" "), /Title mancante/);
  assert.match(pages[0].issues.join(" "), /Meta description mancante/);
  assert.match(pages[0].issues.join(" "), /Canonical mancante/);
});

test("completion stays true at the exact page budget despite methodological and normalization notes", async () => {
  const { crawl } = fixture({ "/": [html()], "/sitemap.xml": [xml(["/"])] });
  const result = await crawl(origin, 0);
  assert.equal(result.complete, true);
  assert.ok(result.limitations.length >= 2);
});

test("page network and non-HTML failures make otherwise covered crawls incomplete", async () => {
  for (const route of [
    () => { throw new Error("Network unavailable"); },
    ["not HTML", 200, { "content-type": "application/json" }],
  ]) {
    const { crawl } = fixture({ "/": [html()], "/sitemap.xml": [xml(["/page"])], "/page": route });
    const result = await crawl(origin, 2);
    assert.equal(result.sitemapFound, true);
    assert.equal(result.complete, false);
  }
});

test("failed, invalid or empty nested sitemaps make the crawl incomplete", async () => {
  for (const route of [
    ["missing", 404],
    ["<not-a-sitemap/>"],
    [xml([])],
    () => { throw new Error("Sitemap network failure"); },
  ]) {
    const { crawl } = fixture({ "/": [html()], "/sitemap.xml": [index(["/nested.xml"])], "/nested.xml": route });
    const result = await crawl(origin, 10);
    assert.equal(result.sitemapFound, true);
    assert.equal(result.complete, false);
  }
});

test("excluded sitemap entries and missing locations make the crawl incomplete", async () => {
  for (const body of [
    index(["/assets/hidden.xml"]),
    '<sitemapindex><sitemap><loc>https://other.example/sitemap.xml</loc></sitemap></sitemapindex>',
    '<urlset><url><loc>https://example.com/</loc></url><url><loc/></url></urlset>',
  ]) {
    const { crawl } = fixture({ "/": [html()], "/sitemap.xml": [body] });
    assert.equal((await crawl(origin, 10)).complete, false);
  }
});
