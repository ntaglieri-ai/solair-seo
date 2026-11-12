import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { validCrmReportSignature } from '../lib/crm-report-signature.ts';

const require = createRequire(import.meta.url), Module = require('node:module');
const state = { queries: 0, documents: 0, rows: [], document: null, values: [] };
const original = Module._load, extension = require.extensions['.ts'];
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
Module._load = function(id, ...rest) {
  if (id.endsWith('/lib/db')) return { getSql: () => async (_strings, ...values) => { state.queries++; state.values = values; return state.rows; } };
  if (id.endsWith('/lib/report-documents/store')) return { getReportDocument: async () => { state.documents++; return state.document; }, getDocumentFileName: async () => 'Solair-Report-Mensile-2026-10.pdf' };
  return original.call(this, id, ...rest);
};
const { GET: list } = require('../app/api/crm-reports/route.ts');
const { GET: pdf } = require('../app/api/crm-reports/[id]/route.ts');
Module._load = original;
if (extension) require.extensions['.ts'] = extension; else delete require.extensions['.ts'];

const secret = 'test-secret';
function signed(path, now = Date.now()) {
  const signature = createHmac('sha256', secret).update(`${now}\nGET\n${path}\n`).digest('hex');
  return new Request(`https://seo.test${path}`, { headers: { 'x-crm-time': String(now), 'x-crm-signature': signature } });
}

test('report signatures bind the exact PDF, filters, method and expiration', () => {
  const now = 1800000000000;
  const request = signed('/api/crm-reports?scheduledSince=2026-11-12T10%3A00%3A00.000Z', now);
  assert.equal(validCrmReportSignature(request, secret, now), true);
  assert.equal(validCrmReportSignature(request, secret, now + 30001), false);
  assert.equal(validCrmReportSignature(request, 'wrong', now), false);
  assert.equal(validCrmReportSignature(new Request('https://seo.test/api/crm-reports', { headers: request.headers }), secret, now), false);
  assert.equal(validCrmReportSignature(new Request(request, { method: 'POST' }), secret, now), false);
  const file = signed('/api/crm-reports/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', now);
  assert.equal(validCrmReportSignature(new Request('https://seo.test/api/crm-reports/bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', { headers: file.headers }), secret, now), false);
});

test('the CRM archive and PDF are inaccessible without a valid machine signature', async () => {
  const previous = process.env.SOLAIR_SEO_SETTINGS_SECRET;
  process.env.SOLAIR_SEO_SETTINGS_SECRET = secret;
  try {
    const params = Promise.resolve({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa' });
    assert.equal((await list(new Request('https://seo.test/api/crm-reports'))).status, 403);
    assert.equal((await pdf(new Request('https://seo.test/api/crm-reports/one'), { params })).status, 403);
    assert.equal(state.queries, 0); assert.equal(state.documents, 0);
    state.rows = [{ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', kind: 'monthly', trigger: 'scheduled', createdAt: new Date('2026-11-12T12:00:00Z'), from: '2026-10-01', to: '2026-10-31' }];
    const since = '2026-11-12T10:00:00.000Z';
    const response = await list(signed(`/api/crm-reports?scheduledSince=${encodeURIComponent(since)}`));
    assert.equal(response.status, 200);
    const { reports } = await response.json();
    assert.match(reports[0].label, /Report mensile.*01\/10\/2026/);
    assert.ok(state.values.includes(since));
    assert.equal((await list(signed('/api/crm-reports?scheduledSince=invalid'))).status, 400);
    state.document = { pdf: Buffer.from('%PDF-1.7 mock') };
    const file = await pdf(signed('/api/crm-reports/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'), { params });
    assert.equal(file.status, 200);
    assert.equal(file.headers.get('x-report-filename'), 'Solair-Report-Mensile-2026-10.pdf');
    assert.equal(file.headers.get('content-type'), 'application/pdf');
    assert.equal(await file.text(), '%PDF-1.7 mock');
    state.document = null;
    assert.equal((await pdf(signed('/api/crm-reports/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'), { params })).status, 404);
  } finally { if (previous === undefined) delete process.env.SOLAIR_SEO_SETTINGS_SECRET; else process.env.SOLAIR_SEO_SETTINGS_SECRET = previous; }
});
