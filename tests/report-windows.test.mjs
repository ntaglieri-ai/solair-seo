import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWindow, lastCompleteMonth, documentFileName, daysIn } from '../lib/report-documents/windows.ts';
test('start-up covers 28 days ending at the last archived day, with no comparison', () => {
  const r = resolveWindow({ kind: 'startup', lastDate: '2026-11-05', previousEnd: null });
  assert.deepEqual(r, { ok: true, current: { from: '2026-10-09', to: '2026-11-05' }, compare: null });
});
test('monthly takes the last complete calendar month and the one before it', () => {
  assert.deepEqual(lastCompleteMonth('2026-11-05'), { from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(lastCompleteMonth('2026-10-31'), { from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(lastCompleteMonth('2026-01-03'), { from: '2025-12-01', to: '2025-12-31' });
  const r = resolveWindow({ kind: 'monthly', lastDate: '2026-03-04', previousEnd: null });
  assert.deepEqual(r.compare, { from: '2026-01-01', to: '2026-01-31' });
  assert.deepEqual(r.current, { from: '2026-02-01', to: '2026-02-28' });
});
test('update starts the day after the previous document and needs at least three days', () => {
  assert.deepEqual(resolveWindow({ kind: 'update', lastDate: '2026-11-12', previousEnd: '2026-11-05' }), { ok: true, current: { from: '2026-11-06', to: '2026-11-12' }, compare: null });
  assert.equal(resolveWindow({ kind: 'update', lastDate: '2026-11-07', previousEnd: '2026-11-05' }).error, 'TOO_FEW_DAYS');
  assert.equal(resolveWindow({ kind: 'update', lastDate: '2026-11-12', previousEnd: null }).error, 'NEEDS_STARTUP');
  assert.equal(resolveWindow({ kind: 'update', lastDate: null, previousEnd: null }).error, 'NO_DATA');
  assert.equal(daysIn({ from: '2026-11-06', to: '2026-11-12' }), 7);
});
test('file names carry the kind and the covered period, without internal codes', () => {
  const d = new Date('2026-11-15T10:00:00Z');
  assert.equal(documentFileName('startup', d, null), 'Solair-Report-Startup-2026-11-15.pdf');
  assert.equal(documentFileName('monthly', d, { from: '2026-10-01', to: '2026-10-31' }), 'Solair-Report-Mensile-2026-10.pdf');
  assert.equal(documentFileName('update', d, { from: '2026-11-06', to: '2026-11-12' }), 'Solair-Aggiornamento-2026-11-06_2026-11-12.pdf');
  assert.equal(documentFileName('update', d, { from: '2026-11-06', to: '2026-11-12' }, 2), 'Solair-Aggiornamento-2026-11-06_2026-11-12-2.pdf');
});
