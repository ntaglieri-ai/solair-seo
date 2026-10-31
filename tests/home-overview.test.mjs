import test from "node:test";
import assert from "node:assert/strict";
import { hasComparableCoverage, performanceReading, splitInterventions } from "../app/data/home-overview.ts";
import { actionPlanFromSnapshot } from "../app/data/action-plan.ts";

test("home compares only two fully covered periods, not merely archive min/max", () => {
  const complete = { lastDate: "2026-10-30", previousComplete: true, current: { days: 28 }, previous: { days: 28 } };
  assert.equal(hasComparableCoverage(complete, 28), true);
  for (const data of [null, { ...complete, lastDate: null }, { ...complete, previousComplete: false },
    { ...complete, current: { days: 10 } }, { ...complete, previous: { days: 27 } }]) {
    assert.equal(hasComparableCoverage(data, 28), false);
  }
});

test("home shows at most three primary proposals without losing additional ones", () => {
  const proposals = Array.from({ length: 6 }, (_, id) => ({ id }));
  const result = splitInterventions(proposals);
  assert.deepEqual(result.primary, proposals.slice(0, 3));
  assert.deepEqual(result.additional, proposals.slice(3));
  assert.deepEqual([...result.primary, ...result.additional], proposals);
  assert.equal(proposals.length, 6);
  assert.deepEqual(splitInterventions([]), { primary: [], additional: [] });
});

test("service reading distinguishes Google clicks from total sessions", () => {
  const search = { lastDate: "2026-10-30", previousComplete: true, current: { days: 28, clicks: 270 }, previous: { days: 28, clicks: 244 } };
  const analytics = { lastDate: search.lastDate, previousComplete: true, current: { days: 28, sessions: 458 }, previous: { days: 28, sessions: 579 } };
  assert.equal(performanceReading(search, analytics).tone, "mixed");
  assert.match(performanceReading(search, analytics).title, /traffico complessivo rallenta/);
  assert.equal(performanceReading(search, { ...analytics, lastDate: "2026-10-29" }).tone, "positive");
  assert.equal(performanceReading({ ...search, current: { days: 10, clicks: 100 } }, analytics).tone, "neutral");
  assert.equal(performanceReading(null, null).tone, "neutral");
});

test("home and proposal page share only valid, current site interventions", () => {
  const now = Date.parse("2026-10-31T12:00:00Z");
  const action = { id: "ctr:/faq:query", title: "CTR", page: "/faq", kind: "ctr", action: "Riscrivere il title", expectedOutcome: "Verificare il CTR", interpretation: "CTR basso", evidence: { clicks: 1 } };
  const snapshot = { status: "complete", validatedAt: "2026-10-31T10:00:00Z", data: { version: "rules-test", settings: { analysisDays: 7 }, windows: { current: { from: "2026-10-01", to: "2026-10-28" } }, opportunities: [action, null, { ...action, id: "check", kind: "contact_check" }] } };
  const plan = actionPlanFromSnapshot(snapshot, now, "rules-test");
  assert.equal(plan.status, "complete");
  assert.deepEqual(plan.actions, [action]);
  assert.deepEqual(plan.period, { from: "2026-10-01", to: "2026-10-28" });
  assert.equal(actionPlanFromSnapshot({ ...snapshot, status: "partial" }, now, "rules-test").status, "partial");
  for (const invalid of [null, { ...snapshot, status: "blocked" }, { ...snapshot, validatedAt: "2026-10-01" }, { ...snapshot, validatedAt: "2026-11-01" }, { ...snapshot, data: { ...snapshot.data, version: "old" } }]) {
    const rejected = actionPlanFromSnapshot(invalid, now, "rules-test");
    assert.equal(rejected.status, "unavailable"); assert.deepEqual(rejected.actions, []);
  }
});
