import assert from 'node:assert/strict';
import test from 'node:test';
import { constantTimeEqual, parsePublishedRun, profileSummary, validateConnectionCode, validateHandle, validateToken } from '../app/lib/profileContract.ts';
import { PACE_CEILING, PACE_SAMPLE_LIMIT } from '../app/practiceModel.js';

const run = {
  timestamp: '2026-08-28T20:00:00.000Z', contentVersion: '2026.08.2', mode: 'sprint',
  challengeKey: 'sprint:prose:30:generated:prose:abc123', target: 'prose / 30 seconds',
  duration: 30, wpm: 104, rawWpm: 109, accuracy: 98.4, consistency: 92,
  errors: 3, pace: [72, 88, 104],
};

test('profile handles are short, safe, normalized, and reserved where needed', () => {
  assert.equal(validateHandle(' BTS_89 '), 'bts_89');
  assert.throws(() => validateHandle('ab'));
  assert.throws(() => validateHandle('@bts'));
  assert.throws(() => validateHandle('typearchy'));
});

test('device tokens and connection codes reject ambiguous or malformed input', () => {
  assert.equal(validateToken(`tpy_${'a'.repeat(64)}`), `tpy_${'a'.repeat(64)}`);
  assert.equal(validateConnectionCode('ABCD-2345'), 'ABCD2345');
  assert.throws(() => validateConnectionCode('ABCO-2345'));
  assert.throws(() => validateToken('not-secret'));
});

test('published runs contain only bounded score and challenge data', () => {
  assert.deepEqual(parsePublishedRun(run), { ...run, schemaVersion: 1 });
  assert.throws(() => parsePublishedRun({ ...run, mode: 'custom' }));
  assert.throws(() => parsePublishedRun({ ...run, wpm: 900 }));
  assert.throws(() => parsePublishedRun({ ...run, wpm: 0 }));
  assert.throws(() => parsePublishedRun({ ...run, rawWpm: 0 }));
  assert.throws(() => parsePublishedRun({ ...run, pace: [] }));
});

test('a slow run with few correct characters is publishable, and junk is not', () => {
  // Three characters over a 60 second test is 0.6 WPM: a real measurement, not junk.
  const slow = { ...run, duration: 60, wpm: 0.6, rawWpm: 0.6, accuracy: 100, consistency: 87.7, errors: 0, pace: [0.6, 0.9] };
  assert.equal(parsePublishedRun(slow).wpm, 0.6);
  assert.equal(parsePublishedRun(slow).rawWpm, 0.6);
  assert.throws(() => parsePublishedRun({ ...slow, wpm: -0.5 }), /Invalid WPM/);
  assert.throws(() => parsePublishedRun({ ...slow, wpm: Number.NaN }), /Invalid WPM/);
});

test('pace samples are bounded by the shared ceiling and the shared count', () => {
  const paced = { ...run, pace: [0.5, PACE_CEILING] };
  assert.deepEqual(parsePublishedRun(paced).pace, [0.5, PACE_CEILING]);
  assert.throws(() => parsePublishedRun({ ...run, pace: [PACE_CEILING + 1] }), /Invalid pace sample/);
  assert.throws(() => parsePublishedRun({ ...run, pace: [-1] }), /Invalid pace sample/);
  assert.equal(parsePublishedRun({ ...run, pace: Array.from({ length: 300 }, () => 20) }).pace.length, PACE_SAMPLE_LIMIT);
});

test('profile summaries use only public runs', () => {
  assert.deepEqual(profileSummary([
    { wpm: 104, accuracy: 98, mode: 'sprint', target: '30 sec', pinned_at: 2 },
    { wpm: 79, accuracy: 100, mode: 'code', target: 'rust', pinned_at: null },
  ]), { best: 104, averageAccuracy: 99, codeBest: 79, pinned: 1 });
});

test('constant time comparison reports exact equality', () => {
  assert.equal(constantTimeEqual('abc', 'abc'), true);
  assert.equal(constantTimeEqual('abc', 'abd'), false);
  assert.equal(constantTimeEqual('abc', 'ab'), false);
});
