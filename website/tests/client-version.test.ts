import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { compareVersions, LATEST_DESKTOP_CLIENT, MINIMUM_DESKTOP_CLIENT, parseClientHeader, requireSupportedClient } from '../app/lib/clientVersion.ts';

test('the advertised desktop version matches the shipped manifest', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8')) as { version: string };
  assert.equal(LATEST_DESKTOP_CLIENT, manifest.version);
  assert.ok(compareVersions(MINIMUM_DESKTOP_CLIENT, LATEST_DESKTOP_CLIENT) <= 0);
});

test('version comparison and header parsing', () => {
  assert.equal(compareVersions('1.2.1', '1.3.0'), -1);
  assert.equal(compareVersions('1.10.0', '1.9.9'), 1);
  assert.equal(compareVersions('2', '2.0.0'), 0);
  assert.equal(parseClientHeader('desktop/1.4.0'), '1.4.0');
  assert.equal(parseClientHeader('browser/1.4.0'), null);
  assert.equal(parseClientHeader(null), null);
  assert.equal(requireSupportedClient(new Request('https://typearchy.com', { headers: { 'X-Typearchy-Client': 'desktop/' + LATEST_DESKTOP_CLIENT } })), LATEST_DESKTOP_CLIENT);
  assert.equal(requireSupportedClient(new Request('https://typearchy.com')), null, 'Browsers and older apps without the header stay supported');
  assert.throws(() => requireSupportedClient(new Request('https://typearchy.com', { headers: { 'X-Typearchy-Client': 'desktop/0.9.0' } })), /Update Typearchy/);
});
