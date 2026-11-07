import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url), Module = require('node:module');
const { NextRequest } = require('next/server');
const state = { token: 'jwt', access: 'rw', status: 200, calls: 0 };
const original = Module._load, extension = require.extensions['.ts'];
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
Module._load = function(id, ...rest) {
  if (id === 'server-only') return {};
  if (id === 'react') return { ...original.call(this, id, ...rest), cache: fn => fn };
  if (id === 'next/headers') return { cookies: async () => ({ get: () => state.token ? { value: state.token } : undefined }) };
  return original.call(this, id, ...rest);
};
const auth = require('../lib/crm-auth.ts');
const oauth = require('../lib/crm-oauth.ts');
const { GET: callback } = require('../app/auth/callback/route.ts');
Module._load = original;
if (extension) require.extensions['.ts'] = extension; else delete require.extensions['.ts'];
const request = (origin = 'https://seo.example') => new Request('https://seo.example/api/home-run', { headers: { origin } });
test('CRM guards deny missing sessions, restrict read-only users and preserve upstream failures', async () => {
  const fetchOriginal = globalThis.fetch, oldUrl = process.env.CRM_URL;
  process.env.CRM_URL = 'https://crm.example';
  globalThis.fetch = async (url, options) => {
    state.calls++;
    assert.equal(url.toString(), 'https://crm.example/api/auth/seo/permissions');
    assert.equal(options.headers.Authorization, 'Bearer jwt');
    assert.equal(options.cache, 'no-store');
    return new Response(JSON.stringify(state.status === 200 ? { access: state.access, name: 'Mario Rossi' } : { error: 'denied' }), { status: state.status });
  };
  try {
    state.token = ''; assert.equal((await auth.requireSeoApi(request(), true)).status, 401); assert.equal(state.calls, 0);
    state.token = 'jwt'; state.access = 'r'; assert.equal(await auth.requireSeoApi(request()), null);
    assert.equal((await auth.requireSeoApi(request(), true)).status, 403);
    assert.equal(await auth.canWriteSeo(), false);
    state.access = 'rw'; assert.equal(await auth.requireSeoApi(request(), true), null);
    assert.equal((await auth.requireSeoApi(request('https://outside.example'), true)).status, 403);
    for (const status of [401, 403, 503]) { state.status = status; assert.equal((await auth.requireSeoApi(request(), true)).status, status); }
    state.status = 200; state.access = 'no_access'; assert.equal((await auth.requireSeoApi(request())).status, 503);
  } finally { globalThis.fetch = fetchOriginal; if (oldUrl === undefined) delete process.env.CRM_URL; else process.env.CRM_URL = oldUrl; }
});
test('OAuth uses fresh PKCE material and refuses external return destinations', () => {
  const a = oauth.pkce(), b = oauth.pkce();
  assert.notEqual(a.state, b.state); assert.notEqual(a.verifier, b.verifier);
  assert.match(a.challenge, /^[A-Za-z0-9_-]{43}$/);
  for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/\nevil.example', '/auth/login', null]) assert.equal(oauth.safeReturnPath(value), '/');
  assert.equal(oauth.safeReturnPath('/report?kind=monthly'), '/report?kind=monthly');
});
test('every data page and interactive API is guarded; only credential-protected machine routes bypass browser login', async () => {
  const { readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]); }
  for (const file of files('app').filter(f => f.endsWith('/page.tsx') && !f.startsWith('app/auth/'))) assert.match(readFileSync(file, 'utf8'), /await requireSeoPage\(\)/, file);
  for (const file of files('app/api').filter(f => f.endsWith('/route.ts'))) {
    if (file === 'app/api/operator/route.ts') continue;
    const source = readFileSync(file, 'utf8');
    if (/\/cron\/|\/engine\/route|\/audit-scores\/route/.test(file)) assert.match(source, /if\s*\(!authorizedEngine/, file);
    else assert.match(source, /await requireSeoApi\(/, file);
  }
});

test('OAuth callback binds state to the initiating browser and exchanges only matching PKCE flows', async () => {
  const oldFetch = globalThis.fetch, oldEnv = { ...process.env };
  Object.assign(process.env, { CRM_SUPABASE_URL: 'https://auth.example', CRM_OAUTH_CLIENT_ID: 'seo', SOLAIR_SEO_URL: 'https://seo.example', CRM_URL: 'https://crm.example' });
  let exchanges = 0;
  const flow = { ...oauth.pkce(), next: '/report', until: Date.now() + 600000 };
  const req = state => new NextRequest(`https://seo.example/auth/callback?code=one-use-code&state=${state}`, { headers: { cookie: `${oauth.FLOW_COOKIE}=${encodeURIComponent(JSON.stringify(flow))}` } });
  globalThis.fetch = async (url, options) => {
    if (url.toString().includes('/oauth/token')) {
      exchanges++;
      assert.equal(options.body.get('code_verifier'), flow.verifier);
      assert.equal(options.body.get('redirect_uri'), 'https://seo.example/auth/callback');
      return Response.json({ access_token: 'jwt', expires_in: 3600 });
    }
    return Response.json({ access: 'r', name: 'Mario Rossi' });
  };
  try {
    const denied = await callback(req('tampered'));
    assert.equal(new URL(denied.headers.get('location')).pathname, '/auth/error');
    assert.equal(exchanges, 0); assert.equal(denied.cookies.get(auth.SEO_SESSION_COOKIE), undefined);
    const success = await callback(req(flow.state));
    assert.equal(success.headers.get('location'), 'https://seo.example/report');
    assert.equal(exchanges, 1); assert.equal(success.cookies.get(auth.SEO_SESSION_COOKIE)?.value, 'jwt');
    assert.equal(success.cookies.get(auth.SEO_SESSION_COOKIE)?.httpOnly, true);
    flow.until = Date.now() - 1;
    assert.equal(new URL((await callback(req(flow.state))).headers.get('location')).pathname, '/auth/error');
    assert.equal(exchanges, 1);
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of ['CRM_SUPABASE_URL','CRM_OAUTH_CLIENT_ID','SOLAIR_SEO_URL','CRM_URL']) { if (oldEnv[key] === undefined) delete process.env[key]; else process.env[key] = oldEnv[key]; }
  }
});
