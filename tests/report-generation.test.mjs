import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFreshReport } from '../lib/report-generation.ts';

const json = (body, status = 200) => Response.json(body, { status });

test('initial report refreshes Google and resumes Gemini before exporting the selected sources', async t => {
  const calls = [];
  const responses = [
    json({ snapshotId: 'new-seo', geoAvailable: true }),
    json({ status: 'in_progress', scanId: 'new-geo', completed: 2, planned: 3 }),
    json({ status: 'done', scanId: 'new-geo', completed: 3, planned: 3 }),
    json({ url: '/report/documento/new-pdf' }),
  ];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return responses.shift();
  });
  const progress = [];
  assert.equal(await generateFreshReport('startup', text => progress.push(text)), '/report/documento/new-pdf');
  assert.deepEqual(calls.map(call => call.url), ['/api/home-run', '/api/geo/scan', '/api/geo/scan', '/api/reports/generate']);
  assert.deepEqual(calls[0].body, { mode: 'analysis' });
  assert.deepEqual(calls.at(-1).body, { kind: 'startup', snapshotId: 'new-seo', geoScanId: 'new-geo', geoRefreshFailed: false, sourceRefreshFailed: false });
  assert.ok(progress.some(text => text.includes('2 di 3')));
});

test('failed Google refresh or missing snapshot never exports unrelated saved data', async t => {
  for (const response of [json({ error: 'Non autorizzato' }, 403), json({ url: '/analisi' })]) {
    let requests = 0;
    t.mock.method(globalThis, 'fetch', async () => { requests++; return response; });
    await assert.rejects(generateFreshReport('startup', () => {}));
    assert.equal(requests, 1);
    t.mock.restoreAll();
  }
});

test('partial refresh is explicitly recorded and update kind is preserved', async t => {
  const calls = [];
  const responses = [json({ snapshotId: 'seo', geoAvailable: true, partial: true }), json({ error: 'Budget esaurito' }, 503), json({ url: '/report/documento/partial' })];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return responses.shift();
  });
  await generateFreshReport('update', () => {});
  assert.deepEqual(calls.at(-1).body, { kind: 'update', snapshotId: 'seo', geoRefreshFailed: true, sourceRefreshFailed: true });
});

test('disabled Gemini is skipped and PDF errors reach the user without another refresh', async t => {
  const calls = [];
  const responses = [json({ snapshotId: 'seo', geoAvailable: false }), json({ error: 'Servono almeno 3 giorni di dati nuovi.' }, 409)];
  t.mock.method(globalThis, 'fetch', async url => { calls.push(url); return responses.shift(); });
  await assert.rejects(generateFreshReport('update', () => {}), /3 giorni/);
  assert.deepEqual(calls, ['/api/home-run', '/api/reports/generate']);
});
