import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS, analysisWindows, isDue, validateSettings } from "../lib/engine/settings.ts";
import { analyzeEvidence, pagePath } from "../lib/engine/analyze.ts";
import { readAllRows } from "../lib/engine/pagination.ts";
import { gatherSources } from "../lib/engine/quality.ts";
import { analysisFingerprint } from "../lib/engine/fingerprint.ts";
import { baselineAudit } from "../app/data/audit-baseline.ts";

const now = new Date("2026-10-31T12:00:00Z");
const domain = "solairgroup.it";

test('the detailed report preserves site-wide public findings and their source references',()=>{
  const f=fixture();
  f.technical.publicAnalysis={version:'public-url-2',findings:[{id:'contact:/contatti',title:'Ripristinare il contatto',priority:'alta',basis:'riscontro',observation:'Un pulsante porta a HTTP 404.',impact:'Il percorso si interrompe.',action:'Correggere il collegamento nel sito.',evidence:[{url:'https://solairgroup.it/',detail:'Pulsante Contattaci → /contatti, HTTP 404'}]}]};
  const result=analyzeEvidence(f);
  assert.equal(result.opportunities[0].id,'public_url:contact:/contatti');assert.equal(result.opportunities[0].priority,'high');
  assert.match(result.opportunities[0].evidence.publicSources[0],/HTTP 404/);
});

test("client action plan contains site work, not platform development", () => {
  const plan = baselineAudit.areas.find(area => area.id === "action-plan");
  assert.ok(plan.opportunities.length);
  assert.doesNotMatch(plan.opportunities.join(" "), /dashboard|API|snapshot|report|database|integrazion/i);
  assert.deepEqual(baselineAudit.trackingSetup.items.find(item => item.id === "measurement-api").nextActions, []);
});
function fixture() {
  const search = () => ({ pages: [], queryPages: [], totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 }, pagesComplete: true, queriesComplete: true });
  const analytics = () => ({ pages: [], reliable: true, timeZones: ["Europe/Rome"], limitations: [] });
  return {
    domain, settings: { ...DEFAULT_SETTINGS }, now,
    evidence: { collectedAt: now.toISOString(), windows: analysisWindows(now, 28, 3), gsc: { current: search(), previous: search() }, ga4: { current: analytics(), previous: analytics() } },
    technical: { complete: true, sitemapFound: true, limitations: ["Solo HTML"], pages: [] },
    technicalAt: now.toISOString(),
  };
}
function row(page, clicks, impressions = 100, position = 7, query) {
  return { keys: query ? [query, `https://${domain}${page}`] : [`https://${domain}${page}`], clicks, impressions, position, ctr: clicks / impressions };
}

test("two equal adjacent periods, UTC and leap years", () => {
  const w = analysisWindows(now, 28, 3);
  assert.deepEqual(w, { current: { from: "2026-10-01", to: "2026-10-28" }, previous: { from: "2026-09-03", to: "2026-09-30" } });
  assert.deepEqual(analysisWindows(new Date("2024-03-03T01:00:00Z"), 7, 3).current, { from: "2024-02-23", to: "2024-02-29" });
});

test("settings reject unknown keys, fractions, strings and invalid ranges", () => {
  for (const settings of [{ collectionDays: 0 }, { windowDays: 1 }, { lagDays: 1 }, { maxPages: 51 }, { enabled: "true" }, { typo: 7 }, { analysisDays: 2.5 }, null, []]) {
    assert.throws(() => validateSettings(settings));
  }
  assert.deepEqual(validateSettings({ enabled: false, analysisDays: 14 }), { enabled: false, analysisDays: 14 });
});

test("scheduler respects exact intervals and first execution", () => {
  assert.equal(isDue(null, 7, now), true);
  assert.equal(isDue("2026-10-24T12:00:00Z", 7, now), true);
  assert.equal(isDue("2026-10-24T12:00:01Z", 7, now), true);
  assert.equal(isDue("2026-10-25T12:00:00Z", 7, now), false);
  assert.equal(isDue("2026-10-30T05:00:30Z", 1, new Date("2026-10-31T05:00:00Z")), true);
});

test("pagination reads every page and identifies safety truncation", async () => {
  const values = [1, 2, 3, 4, 5];
  const fetcher = async (offset, limit) => ({ rows: values.slice(offset, offset + limit) });
  assert.deepEqual(await readAllRows(fetcher, 2), { rows: values, truncated: false });
  assert.deepEqual(await readAllRows(fetcher, 2, 4), { rows: [1, 2, 3, 4], truncated: true });
  assert.equal((await readAllRows(async (offset, limit) => ({ ...await fetcher(offset, limit), total: 4 }), 2, 4)).truncated, false);
});

test("an API error never becomes an empty successful result", async () => {
  await assert.rejects(readAllRows(async () => { throw new Error("invalid_grant"); }, 2), /invalid_grant/);
});

test("path join is restricted to site and explicitly ignores parameters", () => {
  assert.equal(pagePath("http://www.solairgroup.it/faq/?utm_source=x", domain), "/faq");
  for (const path of ["(not set)", "", "https://other.it/faq", "javascript:alert(1)", "//evil.test/faq"]) assert.equal(pagePath(path, domain), null);
});

test("valid empty datasets produce no invented opportunities", () => {
  const result = analyzeEvidence(fixture());
  assert.equal(result.status, "complete");
  assert.equal(result.opportunities.length, 0);
});

test("missing and stale data block analysis rather than using baseline scores", () => {
  const f = fixture(); f.evidence = null;
  assert.equal(analyzeEvidence(f).status, "blocked");
  const old = fixture(); old.evidence.collectedAt = "2026-10-01T00:00:00Z";
  const result = analyzeEvidence(old);
  assert.equal(result.status, "blocked"); assert.deepEqual(result.opportunities, []);
});

test("overlapping and unequal windows block comparisons", () => {
  const f = fixture(); f.evidence.windows.previous.to = "2026-10-01";
  assert.equal(analyzeEvidence(f).status, "blocked");
  const other = fixture(); other.settings.windowDays = 14;
  assert.equal(analyzeEvidence(other).status, "blocked");
});

test("recent unprocessed periods are blocked", () => {
  const f = fixture(); f.evidence.windows = analysisWindows(now, 28, 0);
  assert.equal(analyzeEvidence(f).status, "blocked");
});

test("near-top-ten and low CTR opportunities include measured evidence", () => {
  const f = fixture();
  f.evidence.gsc.current.queryPages = [row("/faq", 1, 120, 5, "fotovoltaico"), row("/cer", 2, 70, 12, "comunità energetiche")];
  const result = analyzeEvidence(f);
  assert.deepEqual(result.opportunities.map(o => o.kind).sort(), ["ctr", "near_top10"]);
  assert.equal(result.opportunities.find(o => o.kind === "ctr").evidence.impressions, 120);
  for (const action of result.opportunities) {
    assert.ok(action.expectedOutcome);
    assert.ok(action.action.includes(action.page));
    assert.ok(action.action.includes(action.query));
  }
});

test("tiny query samples do not create opportunities", () => {
  const f = fixture(); f.evidence.gsc.current.queryPages = [row("/", 0, 3, 12, "query")];
  assert.equal(analyzeEvidence(f).opportunities.length, 0);
});

test("HTTP/www variants of one query-page pair produce one weighted opportunity", () => {
  const f = fixture();
  f.evidence.gsc.current.queryPages = [row("/faq", 0, 60, 4, "fotovoltaico"), {
    ...row("/faq", 1, 50, 6, "fotovoltaico"), keys: ["fotovoltaico", "http://www.solairgroup.it/faq/"],
  }];
  const result = analyzeEvidence(f);
  assert.equal(result.opportunities.length, 1);
  assert.equal(result.opportunities[0].evidence.impressions, 110);
  assert.equal(result.opportunities[0].evidence.clicks, 1);
});

test("traffic drops require sufficient baseline and complete page lists", () => {
  const f = fixture(); f.evidence.gsc.previous.pages = [row("/faq", 50), row("/", 1)];
  f.evidence.gsc.current.pages = [row("/faq", 30)];
  assert.equal(analyzeEvidence(f).checks.filter(o => o.kind === "decline").length, 1);
  assert.equal(analyzeEvidence(f).opportunities.length, 0);
  f.evidence.gsc.current.pagesComplete = false;
  const partial = analyzeEvidence(f);
  assert.equal(partial.status, "partial");
  assert.equal(partial.checks.filter(o => o.kind === "decline").length, 0);
});

test("absence from a paginated GSC response does not establish zero clicks", () => {
  const f = fixture(); f.evidence.gsc.previous.pages = [row("/faq", 20)];
  assert.equal(analyzeEvidence(f).checks.filter(o => o.kind === "decline").length, 0);
});

test("a failed GA4 provider preserves valid GSC evidence", async () => {
  const result = await gatherSources(async () => ({ current: "valid GSC" }), async () => { throw new Error("invalid_grant"); });
  assert.deepEqual(result.gsc, { current: "valid GSC" });
  assert.equal(result.ga4, null);
  assert.match(result.sourceErrors.join(), /invalid_grant/);
  await assert.rejects(gatherSources(async () => { throw new Error("GSC unavailable"); }, async () => "valid GA4"), /GSC unavailable/);
});

test("deduplication cannot republish technical findings after they become stale", () => {
  const f = fixture(); f.evidence.ga4 = null;
  f.technical.pages = [{ url: "https://solairgroup.it/", status: 200, score: 90, title: "", issues: ["Title mancante (-15)"] }];
  const fresh = analyzeEvidence({ ...f, technicalAt: "2026-10-24T00:00:00Z" });
  const stale = analyzeEvidence({ ...f, technicalAt: "2026-10-22T00:00:00Z" });
  assert.equal(fresh.status, "partial"); assert.equal(stale.status, "partial");
  assert.equal(fresh.opportunities.filter(o => o.kind === "technical").length, 1);
  assert.equal(stale.opportunities.filter(o => o.kind === "technical").length, 0);
  const payload = { settings: f.settings, evidence: f.evidence, technical: f.technical, errors: [], day: "2026-10-31" };
  assert.notEqual(analysisFingerprint({ ...payload, analysis: fresh }), analysisFingerprint({ ...payload, analysis: stale }));
  const repeated = { ...f.evidence, collectedAt: "2026-10-31T13:00:00Z" };
  assert.equal(analysisFingerprint({ ...payload, analysis: fresh }), analysisFingerprint({ ...payload, evidence: repeated, analysis: fresh }));
});

test("growth from zero is not expressed as a percentage", () => {
  const f = fixture(); f.evidence.gsc.current.pages = [row("/faq", 50)];
  assert.equal(analyzeEvidence(f).checks.filter(o => o.kind === "growth").length, 0);
});

test("conversion correlation uses Google organic landing pages and no keyword attribution", () => {
  const f = fixture(); f.evidence.gsc.current.pages = [row("/faq", 20)];
  f.evidence.ga4.current.pages = [{ page: "/faq", sessions: 40, engagedSessions: 20, contactEvents: 0, formSubmissions: 0 }];
  const result = analyzeEvidence(f); const o = result.checks.find(o => o.kind === "contact_check");
  assert.equal(result.opportunities.length, 0);
  assert.equal(o.evidence.googleOrganicSessions, 40); assert.equal(o.query, undefined);
  assert.match(result.limitations.join(" "), /non un’attribuzione keyword-lead/);
  f.evidence.ga4.current.pages[0].contactEvents = 1;
  assert.equal(analyzeEvidence(f).checks.filter(o => o.kind === "contact_check").length, 0);
});

test("thresholded or sampled GA4 cannot produce conversion conclusions", () => {
  const f = fixture(); f.evidence.gsc.current.pages = [row("/faq", 20)];
  f.evidence.ga4.current.pages = [{ page: "/faq", sessions: 50, engagedSessions: 20, contactEvents: 0, formSubmissions: 0 }];
  f.evidence.ga4.current.reliable = false;
  assert.equal(analyzeEvidence(f).status, "partial");
  assert.equal(analyzeEvidence(f).checks.filter(o => o.kind === "contact_check").length, 0);
});

test("technical findings come only from fresh actual crawls", () => {
  const f = fixture(); f.technical.pages = [{ url: `https://${domain}/faq`, title: "", status: 404, score: null, issues: ["HTTP 404"] }];
  assert.equal(analyzeEvidence(f).checks[0].kind, "technical");
  f.technicalAt = "2026-09-01T00:00:00Z";
  assert.equal(analyzeEvidence(f).opportunities.length, 0);
  assert.equal(analyzeEvidence(f).checks.length, 0);
});

test("technical interventions exclude unverified length and schema heuristics", () => {
  const f = fixture();
  f.technical.pages = [{ url: `https://${domain}/faq`, title: "FAQ", status: 200, score: 80,
    issues: ["Title fuori range (25 char) (-7)", "Schema.org assente (-5)", "2 immagini senza alt (-4)"] }];
  const result = analyzeEvidence(f);
  assert.equal(result.opportunities.length, 1);
  assert.deepEqual(result.opportunities[0].evidence.issues, ["2 immagini senza alt (-4)"]);
  assert.match(result.opportunities[0].action, /testi alternativi/);
  assert.ok(result.opportunities[0].expectedOutcome);
  assert.equal(result.checks.length, 1);
  assert.deepEqual(result.checks[0].evidence.issues, ["Title fuori range (25 char) (-7)", "Schema.org assente (-5)"]);
  assert.match(result.checks[0].interpretation, /non sono limiti imposti da Google/);
});

test("a missing title yields a concrete site intervention, not platform work", () => {
  const f = fixture();
  f.technical.pages = [{ url: `https://${domain}/faq`, title: "", status: 200, score: 85, issues: ["Title mancante (-15)"] }];
  const result = analyzeEvidence(f);
  assert.equal(result.checks.length, 0);
  assert.match(result.opportunities[0].action, /Aggiungere un title/);
  assert.doesNotMatch(result.opportunities[0].action, /integrare API|dashboard|report|database/i);
});

test("methodological caveats do not mean incomplete technical coverage", () => {
  const f = fixture(); assert.equal(analyzeEvidence(f).status, "complete");
  f.technical.complete = false; assert.equal(analyzeEvidence(f).status, "partial");
});
