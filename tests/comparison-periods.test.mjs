import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonPeriods, formatPeriod } from '../lib/comparison-periods.ts';
test('visible comparison windows are equal, adjacent and anchored to the source date',()=>{
  assert.deepEqual(comparisonPeriods('2026-11-03'),{current:{from:'2026-10-07',to:'2026-11-03'},previous:{from:'2026-09-09',to:'2026-10-06'}});
  assert.deepEqual(comparisonPeriods('2026-01-05',7),{current:{from:'2025-12-30',to:'2026-01-05'},previous:{from:'2025-12-23',to:'2025-12-29'}});
  assert.deepEqual(comparisonPeriods('2024-03-01',2),{current:{from:'2024-02-29',to:'2024-03-01'},previous:{from:'2024-02-27',to:'2024-02-28'}});
});
test('both displayed endpoints include their actual year',()=>{
  assert.equal(formatPeriod({from:'2025-12-30',to:'2026-01-05'}),'30 dicembre 2025 – 5 gennaio 2026');
});
