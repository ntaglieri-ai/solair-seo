import test from "node:test";
import assert from "node:assert/strict";
import { hasComparableCoverage, splitInterventions } from "../app/data/home-overview.ts";

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
