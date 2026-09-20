// Run against the disposable local development database only.
import assert from 'node:assert/strict';

const origin = process.env.TYPEARCHY_TEST_ORIGIN || 'http://localhost:5178';
assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):[0-9]+$/, 'Integration tests only run against a local server');
const suffix = Date.now().toString(36);

async function request(path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(origin + path, {
    method,
    headers: { Origin: origin, 'CF-Connecting-IP': `local-history-${suffix}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, data: (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : await response.text() };
}

const run = (index) => ({
  clientId: `history-${suffix}-${index}`,
  schemaVersion: 1,
  contentVersion: '2026.08.2',
  mode: index % 3 === 0 ? 'custom' : 'sprint',
  challengeKey: `sprint:30:fixture:${index}`,
  target: 'PROSE / 30 SEC',
  duration: 30,
  wpm: 60 + (index % 40),
  rawWpm: 64 + (index % 40),
  accuracy: 96,
  consistency: 90,
  errors: index % 5,
  pace: [50, 60, 70],
  interrupted: index % 7 === 0,
  completed: true,
  createdAt: new Date(Date.UTC(2026, 8, 1, 12, 0, index % 60)).toISOString(),
});

try {
  const registered = await request('/api/session', { method: 'POST', body: { handle: `history_${suffix}` } });
  assert.equal(registered.response.status, 201, JSON.stringify(registered.data));
  const cookie = registered.response.headers.get('set-cookie').split(';')[0];

  // Nothing is kept until the player asks.
  const empty = await request('/api/account/history', { cookie });
  assert.equal(empty.response.status, 200);
  assert.deepEqual(empty.data.runs, []);

  // One device syncs its history in batches.
  const first = await request('/api/account/history', { method: 'POST', cookie, body: { runs: Array.from({ length: 200 }, (_, index) => run(index)) } });
  assert.equal(first.response.status, 200, JSON.stringify(first.data));
  assert.equal(first.data.added, 200);
  assert.equal(first.data.kept, 200);

  // Syncing the same runs again changes nothing, which is what makes a retry safe.
  const repeated = await request('/api/account/history', { method: 'POST', cookie, body: { runs: Array.from({ length: 200 }, (_, index) => run(index)) } });
  assert.equal(repeated.response.status, 200);
  assert.equal(repeated.data.added, 0, 'a repeated sync must not duplicate rows');
  assert.equal(repeated.data.kept, 200);

  await request('/api/account/history', { method: 'POST', cookie, body: { runs: Array.from({ length: 200 }, (_, index) => run(200 + index)) } });
  const third = await request('/api/account/history', { method: 'POST', cookie, body: { runs: Array.from({ length: 120 }, (_, index) => run(400 + index)) } });
  assert.equal(third.response.status, 200);
  assert.equal(third.data.kept, 500, 'the newest 500 runs are kept');

  // Older rows are what gets dropped, newest first when read back.
  const listed = await request('/api/account/history', { cookie });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.data.runs.length, 100);
  assert.ok(listed.data.nextCursor, 'more history is reachable through the cursor');
  const stamps = listed.data.runs.map((entry) => entry.createdAt);
  assert.deepEqual(stamps, [...stamps].sort().reverse(), 'history reads newest first');
  assert.deepEqual(listed.data.runs[0].pace, [50, 60, 70], 'a row carries its pace series');
  assert.equal(listed.data.runs[0].pace_json, undefined, 'the stored column is not part of the response');
  assert.equal(typeof listed.data.runs[0].wpm, 'number');
  assert.equal(typeof listed.data.runs[0].interrupted, 'boolean');

  const second = await request(`/api/account/history?cursor=${encodeURIComponent(listed.data.nextCursor)}`, { cookie });
  assert.equal(second.response.status, 200);
  assert.equal(second.data.runs.length, 100);
  const ids = new Set([...listed.data.runs, ...second.data.runs].map((entry) => entry.clientId));
  assert.equal(ids.size, 200, 'paging through history yields distinct rows');

  // A rejected row rejects the whole batch, and the message names it.
  const rejected = await request('/api/account/history', { method: 'POST', cookie, body: { runs: [run(999), { ...run(1000), wpm: -1 }] } });
  assert.equal(rejected.response.status, 400);
  assert.match(rejected.data.error, /Row 2: invalid WPM/);
  const afterRejection = await request('/api/account/history', { cookie });
  assert.equal(afterRejection.data.runs.some((entry) => entry.client_id === run(999).clientId), false, 'a rejected batch writes nothing');

  // Signing out means no history is reachable.
  const anonymous = await request('/api/account/history');
  assert.equal(anonymous.response.status, 401);

  console.log(`Account history passed: explicit sync, idempotent retries, the newest ${third.data.kept} runs kept, cursor paging, whole-batch rejection, and no anonymous access.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
