import assert from 'node:assert/strict';
import test from 'node:test';
import { ACCOUNT_HISTORY_BATCH, parseSyncedRun, parseSyncedRuns } from '../app/lib/accountHistory.ts';
import { PACE_CEILING, PACE_SAMPLE_LIMIT } from '../app/practiceModel.js';

const run = {
  clientId: 'run-1', schemaVersion: 1, contentVersion: '2026.08.2', mode: 'sprint', challengeKey: 'sprint:30',
  target: 'prose / 30 seconds', duration: 30, wpm: 84.2, rawWpm: 88, accuracy: 96.5, consistency: 92,
  errors: 3, pace: [80, 84.2], interrupted: false, completed: true, publicSlug: null,
  createdAt: '2026-09-20T04:00:00Z',
};

test('a synced run keeps the aggregate fields and nothing else', () => {
  const parsed = parseSyncedRun({ ...run, prompt: 'secret passage', typedText: 'secret', keystrokes: [1, 2, 3] }, 1);
  assert.deepEqual(Object.keys(parsed).sort(), [
    'accuracy', 'challengeKey', 'clientId', 'completed', 'consistency', 'contentVersion', 'createdAt',
    'duration', 'errors', 'interrupted', 'mode', 'pace', 'publicSlug', 'rawWpm', 'schemaVersion', 'target', 'wpm',
  ]);
  assert.equal(parsed.wpm, 84.2);
  assert.equal(parsed.rawWpm, 88);
  assert.equal(parsed.createdAt, '2026-09-20T04:00:00.000Z');
  assert.equal(parsed.publicSlug, null);
});

test('practice history accepts the modes a device records, including custom and paused runs', () => {
  for (const mode of ['sprint', 'daily', 'quote', 'shell', 'code', 'drill', 'custom', 'words', 'focus']) {
    assert.equal(parseSyncedRun({ ...run, mode }, 1).mode, mode);
  }
  assert.throws(() => parseSyncedRun({ ...run, mode: 'telepathy' }, 4), /Row 4: invalid mode/);
});

test('bounds are enforced with a readable row number', () => {
  assert.throws(() => parseSyncedRun({ ...run, wpm: 1001 }, 2), /Row 2: invalid WPM/);
  assert.throws(() => parseSyncedRun({ ...run, accuracy: 101 }, 2), /Row 2: invalid accuracy/);
  assert.throws(() => parseSyncedRun({ ...run, errors: -1 }, 2), /Row 2: invalid errors/);
  assert.throws(() => parseSyncedRun({ ...run, duration: 12.5 }, 2), /Row 2: invalid duration/);
  assert.throws(() => parseSyncedRun({ ...run, clientId: '' }, 2), /Row 2: invalid run id/);
  assert.throws(() => parseSyncedRun({ ...run, createdAt: 'never' }, 2), /Row 2: invalid timestamp/);
  assert.throws(() => parseSyncedRun({ ...run, pace: Array.from({ length: PACE_SAMPLE_LIMIT + 1 }, () => 10) }, 2), /Row 2: too many pace samples/);
  assert.throws(() => parseSyncedRun({ ...run, pace: [PACE_CEILING + 1] }, 2), /Row 2: invalid pace sample 1/);
  assert.throws(() => parseSyncedRun(null, 2), /Row 2: not a run/);
  // An untimed custom run is legitimate: no duration, no raw speed.
  assert.equal(parseSyncedRun({ ...run, mode: 'custom', duration: 0, wpm: 0, rawWpm: 0, pace: [] }, 1).duration, 0);
});

test('a batch is capped so one sync cannot be unbounded', () => {
  assert.equal(parseSyncedRuns([run, { ...run, clientId: 'run-2' }]).length, 2);
  assert.throws(() => parseSyncedRuns(Array.from({ length: ACCOUNT_HISTORY_BATCH + 1 }, (_, index) => ({ ...run, clientId: `run-${index}` }))), /at most 200 runs/);
  assert.throws(() => parseSyncedRuns('runs'), /Send the runs you want to keep/);
});
