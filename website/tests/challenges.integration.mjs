// Run against the disposable local development database only.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const origin = process.env.TYPEARCHY_TEST_ORIGIN || 'http://localhost:5177';
assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):[0-9]+$/, 'Integration tests only run against a local server');
const suffix = Date.now().toString(36);
const clients = [];
const recoveryCodes = new Map();
async function request(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const response = await fetch(origin + path, { method, headers: { Origin: origin, 'CF-Connecting-IP': `local-test-${suffix}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { response, data: (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : await response.text() };
}
async function register(name) {
  const result = await request('/api/session', { method: 'POST', body: { handle: `${name}_${suffix}` } });
  assert.equal(result.response.status, 201, JSON.stringify(result.data));
  const cookie = result.response.headers.get('set-cookie').split(';')[0];
  recoveryCodes.set(name, result.data.recoveryCode);
  clients.push(cookie); return cookie;
}
try {
  const creator = await register('creator');
  const racer = await register('racer');
  const tokyoTheme = { name:'TOKYO NIGHT', short:'TOKYO', bg:'#1a1b26', panel:'#24283b', ink:'#c0caf5', muted:'#565f89', accent:'#7aa2f7', error:'#f7768e' };
  const practice = { clientRunId:'local-practice-' + suffix, timestamp:new Date().toISOString(), contentVersion:'2026.08.2', mode:'sprint', challengeKey:'sprint:prose:30:generated:prose:one', target:'PROSE / 30 SEC', duration:30, wpm:70, rawWpm:74, accuracy:97, consistency:90, errors:2, pace:[60,70], theme:tokyoTheme };
  const sharedPractice = await request('/api/runs', { method:'POST', cookie:creator, body:practice });
  assert.equal(sharedPractice.response.status, 201, JSON.stringify(sharedPractice.data));
  const practiceRetry = await request('/api/runs', { method:'POST', cookie:creator, body:{...practice, theme:undefined} });
  assert.equal(practiceRetry.response.status, 200);
  assert.equal(practiceRetry.data.slug, sharedPractice.data.slug, 'Sharing a result twice must keep one URL');
  const practicePage = await request(`/r/${sharedPractice.data.slug}`);
  assert.equal(practicePage.response.status, 200);
  assert.match(practicePage.data, /TOKYO NIGHT/, 'The first saved theme survives retries');
  const practiceImage = await fetch(`${origin}/og/r/${sharedPractice.data.slug}`);
  assert.equal(practiceImage.status, 200);
  assert.match(practiceImage.headers.get('content-type'), /image\/png/);
  const passage = 'Clear feedback makes deliberate practice useful.';
  let result = await request('/api/challenges', { method: 'POST', cookie: creator, body: { title: 'Clear feedback', attribution: 'Typearchy original passage', passage, language: 'prose', autoIndent: false, visibility: 'public' } });
  assert.equal(result.response.status, 201, JSON.stringify(result.data));
  const challenge = result.data.slug;
  assert.equal(result.data.reviewPending, false);
  const pending = await request('/api/challenges', { method: 'POST', cookie: creator, body: { title: 'My custom passage', passage, language: 'prose', autoIndent: false, visibility: 'public' } });
  assert.equal(pending.response.status, 201);
  assert.equal(pending.data.reviewPending, true);
  assert.equal((await request('/api/challenges/' + pending.data.slug)).response.status, 404);
  assert.equal((await request('/api/challenges/' + pending.data.slug, { cookie: creator })).response.status, 200);
  assert.equal((await request('/api/challenges/' + pending.data.slug + '/attempts', { method: 'POST', cookie: racer })).response.status, 404);
  assert.equal((await request('/api/moderation', { cookie: creator })).response.status, 403);
  const report = await request('/api/challenges/' + challenge + '/report', { method: 'POST', body: { reason: 'other', detail: 'Local integration test' } });
  assert.equal(report.response.status, 201);
  result = await request(`/api/challenges/${challenge}/attempts`, { method: 'POST', cookie: racer });
  assert.equal(result.response.status, 201, JSON.stringify(result.data));
  const session = result.data;
  const events = Array.from(passage).map((text, index) => ({ type: 'input', text, at: index * 30 }));
  await wait(events.at(-1).at + 100);
  result = await request(`/api/attempts/${session.id}`, { method: 'POST', headers: { 'X-Attempt-Token': session.token }, body: { events, theme: tokyoTheme, wpm: 999 } });
  assert.equal(result.response.status, 201, JSON.stringify(result.data));
  const attempt = result.data.slug;
  const retry = await request(`/api/attempts/${session.id}`, { method: 'POST', headers: { 'X-Attempt-Token': session.token }, body: { events } });
  assert.equal(retry.response.status, 200); assert.equal(retry.data.slug, attempt);
  const beforePublish = await request(`/a/${attempt}`);
  assert.equal(beforePublish.response.status, 404, 'Unpublished results must not be public');
  const foreign = await request(`/api/attempts/${session.id}/publish`, { method: 'POST', cookie: creator, headers: { 'X-Attempt-Token': session.token } });
  assert.equal(foreign.response.status, 404, 'A different account must not claim the result');
  const publish = await request(`/api/attempts/${session.id}/publish`, { method: 'POST', cookie: racer, headers: { 'X-Attempt-Token': session.token } });
  assert.equal(publish.response.status, 200, JSON.stringify(publish.data));
  const resultPage = await request(`/a/${attempt}`);
  assert.equal(resultPage.response.status, 200);
  assert.match(resultPage.data, /TOKYO NIGHT/);
  const standings = await request(`/c/${challenge}`);
  assert.equal(standings.response.status, 200);
  assert.match(standings.data, new RegExp(`racer_${suffix}`));
  const hide = await request('/api/profile', { method: 'PATCH', cookie: racer, body: { visibility: 'private' } });
  assert.equal(hide.response.status, 200);
  assert.equal((await request(`/a/${attempt}`)).response.status, 404);
  assert.ok(!(await request(`/c/${challenge}`)).data.includes(`racer_${suffix}`));
  const csrf = await request('/api/profile', { method: 'PATCH', cookie: creator, headers: { Origin: 'https://unrelated.invalid' }, body: { visibility: 'private' } });
  assert.equal(csrf.response.status, 403);
  const token = 'tpy_' + randomBytes(32).toString('hex');
  const connection = await request('/api/connect/start', { method: 'POST', body: { token, label: 'Native integration', kind: 'connect' } });
  assert.equal(connection.response.status, 201);
  const link = await request('/api/session/link', { method: 'POST', cookie: creator, body: { code: connection.data.code } });
  assert.equal(link.response.status, 200);
  assert.equal((await request('/api/session/link', { method: 'POST', cookie: creator, body: { code: connection.data.code } })).response.status, 200);
  assert.equal((await request('/api/session/link', { method: 'POST', cookie: racer, body: { code: connection.data.code } })).response.status, 409);
  const nativeDirectory = mkdtempSync(join(tmpdir(), 'typearchy-native-api-'));
  try {
    writeFileSync(join(nativeDirectory, 'profile.json'), JSON.stringify({ token }), { mode: 0o600 });
    const helper = (...args) => JSON.parse(execFileSync(fileURLToPath(new URL('../../bin/typearchy-cloud', import.meta.url)), args, { env: { ...process.env, TYPEARCHY_API_URL: origin, TYPEARCHY_STATE_DIR: nativeDirectory }, encoding: 'utf8' }));
    assert.equal(helper('challenge', challenge).challenge.slug, challenge);
    const nativeSession = helper('attempt-start', challenge);
    assert.equal(nativeSession.token, undefined, 'Native UI must not receive the private attempt token');
    writeFileSync(join(nativeDirectory, 'attempt-recording.json'), JSON.stringify({ events }), { mode: 0o600 });
    await wait(events.at(-1).at + 100);
    const nativeResult = helper('attempt-submit', nativeSession.id, join(nativeDirectory, 'attempt-recording.json'));
    assert.ok(nativeResult.saved);
    assert.equal(helper('attempt-publish', nativeSession.id).slug, nativeResult.slug);
  } finally { rmSync(nativeDirectory, { recursive: true, force: true }); }
  const devices = await request('/api/account', { cookie: creator });
  const nativeDevice = devices.data.devices.find(device => device.label === 'Native integration');
  assert.ok(nativeDevice);
  assert.equal((await request('/api/account', { method: 'PATCH', cookie: racer, body: { revokeDevice: nativeDevice.id } })).response.status, 404);
  assert.equal((await request('/api/account', { method: 'PATCH', cookie: creator, body: { revokeDevice: nativeDevice.id } })).response.status, 200);
  assert.equal((await request('/api/device', { headers: { Authorization: 'Bearer ' + token } })).response.status, 401);
  const recovered = await request('/api/session', { method: 'POST', body: { action: 'recover', handle: `creator_${suffix}`, recoveryCode: recoveryCodes.get('creator') } });
  assert.equal(recovered.response.status, 200, JSON.stringify(recovered.data));
  assert.notEqual(recovered.data.recoveryCode, recoveryCodes.get('creator'));
  assert.equal((await request('/api/session', { cookie: creator })).data.handle, null);
  clients[0] = recovered.response.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/account/challenges', { cookie: clients[0] })).data.challenges.length, 2);
  assert.equal((await request('/api/session', { method: 'POST', body: { action: 'recover', handle: `creator_${suffix}`, recoveryCode: recoveryCodes.get('creator') } })).response.status, 401);
  console.log('Local challenge integration passed: create, complete, retry, themed result URLs, practice sharing, claim ownership, publish, standings, privacy, origin checks, native helper, device linking/revocation, and recovery.');
} finally {
  for (const cookie of clients) {
    const cleanup = await request('/api/profile', { method: 'DELETE', cookie });
    assert.equal(cleanup.response.status, 200, 'Local test profile cleanup failed');
  }
}
