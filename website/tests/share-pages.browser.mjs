// The pages a stranger lands on when someone shares a score: /r/, /c/, /a/, /u/, plus the social card
// images those pages point at. Data is created through the api first, then each page is audited the same
// way the public routes are.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { setTimeout as wait } from 'node:timers/promises';
import { auditPage } from './helpers/pageAudit.mjs';

const origin = process.env.TYPEARCHY_TEST_ORIGIN || 'http://localhost:5178';
assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):[0-9]+$/, 'this suite runs against the local worker');
const suffix = Date.now().toString(36);

async function request(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const response = await fetch(origin + path, { method, headers: { Origin: origin, 'CF-Connecting-IP': `share-pages-${suffix}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { response, data: (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : await response.text() };
}
async function register(name) {
  const result = await request('/api/session', { method: 'POST', body: { handle: `${name}_${suffix}` } });
  assert.equal(result.response.status, 201, JSON.stringify(result.data));
  return result.response.headers.get('set-cookie').split(';')[0];
}

const browser = await chromium.launch({ ...(process.env.TYPEARCHY_CHROMIUM ? { executablePath: process.env.TYPEARCHY_CHROMIUM } : {}) });
const context = await browser.newContext({ extraHTTPHeaders: { Origin: origin } });
const page = await context.newPage();
const failures = [];
let cookies = [];

try {
  // A shared practice result, a challenge, and a published attempt on it.
  const creator = await register('share');
  const racer = await register('racer');
  cookies = [creator, racer];
  const shared = await request('/api/runs', { method: 'POST', cookie: creator, body: { clientRunId: `share-pages-${suffix}`, timestamp: new Date().toISOString(), contentVersion: '2026.08.2', mode: 'sprint', challengeKey: 'sprint:prose:30:generated:prose:one', target: 'PROSE / 30 SEC', duration: 30, wpm: 70, rawWpm: 74, accuracy: 97, consistency: 90, errors: 2, pace: [60, 70], theme: { name: 'PAPER', short: 'PAPER', bg: '#f4f0e6', panel: '#e7e1d4', ink: '#282b27', muted: '#77786f', accent: '#426b8a', error: '#b4473f' } } });
  assert.equal(shared.response.status, 201, JSON.stringify(shared.data));
  const passage = 'Clear feedback makes deliberate practice useful.';
  const challenge = await request('/api/challenges', { method: 'POST', cookie: creator, body: { title: 'Share page passage', attribution: 'Typearchy original passage', passage, language: 'prose', autoIndent: false, visibility: 'public' } });
  assert.equal(challenge.response.status, 201, JSON.stringify(challenge.data));
  const race = await request(`/api/challenges/${challenge.data.slug}/attempts`, { method: 'POST', cookie: racer });
  assert.equal(race.response.status, 201, JSON.stringify(race.data));
  const events = Array.from(passage).map((text, index) => ({ type: 'input', text, at: index * 30 }));
  await wait(events.at(-1).at + 120);
  const finished = await request(`/api/attempts/${race.data.id}`, { method: 'POST', headers: { 'X-Attempt-Token': race.data.token }, body: { events } });
  assert.equal(finished.response.status, 201, JSON.stringify(finished.data));
  assert.equal((await request(`/api/attempts/${race.data.id}/publish`, { method: 'POST', cookie: racer, headers: { 'X-Attempt-Token': race.data.token } })).response.status, 200);

  const surfaces = [
    [`/r/${shared.data.slug}`, 'shared practice result'],
    [`/c/${challenge.data.slug}`, 'challenge'],
    [`/a/${finished.data.slug}`, 'published attempt'],
    [`/u/share_${suffix}`, 'profile'],
  ];
  for (const [path, label] of surfaces) {
    const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.ok(response && response.status() === 200, `${path} (${label}) returned ${response ? response.status() : 'no response'}`);
    await page.waitForTimeout(900);
    for (const finding of [...new Set(await auditPage(page))]) failures.push(`${path}: ${finding}`);
    // Every one of these pages advertises a social card, so the card has to exist.
    const card = await page.evaluate(() => document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '');
    assert.match(card, /^https:\/\/typearchy\.com\/og\//, `${path} advertises no social card`);
    const image = await context.request.get(origin + new URL(card).pathname);
    assert.equal(image.status(), 200, `${new URL(card).pathname} returned ${image.status()}`);
    assert.match(image.headers()['content-type'] || '', /image\/png/, `${new URL(card).pathname} is not a png`);
  }

  assert.deepEqual(failures, [], `share page findings:\n${failures.join('\n')}`);
  console.log('Share pages passed: the shared result, challenge, published attempt and profile all render clean, and each one\'s social card resolves as a png.');
} finally {
  await browser.close();
  for (const cookie of cookies) await fetch(origin + '/api/profile', { method: 'DELETE', headers: { Origin: origin, Cookie: cookie } }).catch(() => undefined);
}
