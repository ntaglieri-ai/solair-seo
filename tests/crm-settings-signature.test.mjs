import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { validSettingsSignature } from '../lib/crm-settings-signature.ts';

test('CRM settings signatures bind method, path, body and expiry', () => {
  const now = 1800000000000, secret = 'test-secret', body = '{"report":{}}';
  const signature = createHmac('sha256', secret).update(`${now}\nPATCH\n/api/crm-settings\n${body}`).digest('hex');
  const headers = new Headers({ 'x-crm-time': String(now), 'x-crm-signature': signature });
  assert.equal(validSettingsSignature(headers, 'PATCH', body, secret, now), true);
  assert.equal(validSettingsSignature(headers, 'GET', body, secret, now), false);
  assert.equal(validSettingsSignature(headers, 'PATCH', body, secret, now, '/api/crm-reports/another-report'), false);
  assert.equal(validSettingsSignature(headers, 'PATCH', body + ' ', secret, now), false);
  assert.equal(validSettingsSignature(headers, 'PATCH', body, secret, now + 30001), false);
  assert.equal(validSettingsSignature(headers, 'PATCH', body, secret, now - 30001), false);
  assert.equal(validSettingsSignature(headers, 'PATCH', body, undefined, now), false);
  assert.equal(validSettingsSignature(headers, 'PATCH', body, 'wrong', now), false);
  assert.equal(validSettingsSignature(new Headers(), 'PATCH', body, secret, now), false);
});
