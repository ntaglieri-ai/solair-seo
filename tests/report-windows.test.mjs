import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWindow, documentFileName, daysIn } from '../lib/report-documents/windows.ts';
test('start-up covers 28 days ending at the last archived day, with no comparison', () => {
  const r = resolveWindow({ kind: 'startup', lastDate: '2026-11-05', previousEnd: null });
  assert.deepEqual(r, { ok: true, current: { from: '2026-10-09', to: '2026-11-05' }, compare: null });
});
test('monthly (periodic) covers the configured cadence ending at the last archived day, compared to the same span before it', () => {
  const r = resolveWindow({ kind: 'monthly', lastDate: '2026-11-05', previousEnd: null, periodicDays: 90 });
  assert.deepEqual(r.current, { from: '2026-08-08', to: '2026-11-05' });
  assert.deepEqual(r.compare, { from: '2026-05-10', to: '2026-08-07' });
});
test('monthly (periodic) falls back to a 30-day cadence when none is given', () => {
  const r = resolveWindow({ kind: 'monthly', lastDate: '2026-11-05', previousEnd: null });
  assert.deepEqual(r.current, { from: '2026-10-07', to: '2026-11-05' });
  assert.deepEqual(r.compare, { from: '2026-09-07', to: '2026-10-06' });
});
test('manual updates remain available with few new days; comparisons require three days', () => {
  assert.deepEqual(resolveWindow({ kind: 'update', lastDate: '2026-11-12', previousEnd: '2026-11-05' }), { ok: true, current: { from: '2026-11-06', to: '2026-11-12' }, compare: { from: '2026-10-30', to: '2026-11-05' } });
  assert.equal(resolveWindow({ kind: 'update', lastDate: '2026-11-07', previousEnd: '2026-11-05' }).compare, null);
  assert.deepEqual(resolveWindow({ kind: 'update', lastDate: '2026-11-05', previousEnd: '2026-11-05' }).current, { from: '2026-11-05', to: '2026-11-05' });
  assert.equal(resolveWindow({ kind: 'update', lastDate: '2026-11-12', previousEnd: null }).error, 'NEEDS_STARTUP');
  assert.equal(resolveWindow({ kind: 'update', lastDate: null, previousEnd: null }).error, 'NO_DATA');
  assert.equal(daysIn({ from: '2026-11-06', to: '2026-11-12' }), 7);
});
test('file names carry the kind and the covered period, without internal codes', () => {
  const d = new Date('2026-11-15T10:00:00Z');
  assert.equal(documentFileName('startup', d, null), 'Solair-Report-Startup-2026-11-15.pdf');
  assert.equal(documentFileName('monthly', d, { from: '2026-08-08', to: '2026-11-05' }), 'Solair-Report-Periodico-2026-08-08_2026-11-05.pdf');
  assert.equal(documentFileName('update', d, { from: '2026-11-06', to: '2026-11-12' }), 'Solair-Aggiornamento-2026-11-06_2026-11-12.pdf');
  assert.equal(documentFileName('update', d, { from: '2026-11-06', to: '2026-11-12' }, 2), 'Solair-Aggiornamento-2026-11-06_2026-11-12-2.pdf');
});
