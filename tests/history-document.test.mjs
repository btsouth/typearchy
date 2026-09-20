// History is the product: one document format both clients can write, and a reader that keeps
// accepting every shape a client has already shipped. These are the rules that make an export
// restorable and an import repeatable, tested against the shared model rather than either client.

import assert from 'node:assert/strict';
import { loadQmlLibrary } from './qml-library.mjs';

const model = loadQmlLibrary(new URL('../TypearchyModel.js', import.meta.url));

const run = (overrides = {}) => ({
  timestamp: '2026-09-01T10:00:00Z', date: '2026-09-01', mode: 'sprint', duration: 30,
  target: '30 seconds', challengeKey: 'sprint:30', contentVersion: '2026.08.2', characters: 200,
  wpm: 80, rawWpm: 84, accuracy: 97, consistency: 92, errors: 2, pace: [72, 80, 86],
  keyMistakes: { e: 2 }, ...overrides,
});

const state = (() => {
  let next = model.recordRun(model.emptyState(), run({ publicSlug: 'ABCDEFGH', publicPinned: true }));
  next = model.recordRun(next, run({
    timestamp: '2026-09-02T10:00:00Z', date: '2026-09-02', mode: 'code', challengeKey: 'code:ruby:x',
    target: 'RUBY / 30 SEC', wpm: 55, accuracy: 91, interrupted: true, passage: 'def total\n  @sum = 1\nend',
  }));
  return next;
})();

const document = model.historyDocument(state);
assert.equal(document.format, model.HISTORY_FORMAT);
assert.equal(document.version, model.HISTORY_VERSION);
assert.equal(document.runs.length, 2);
assert.match(document.exportedAt, /^\d{4}-\d{2}-\d{2}T/);
assert.equal(document.runs[0].duration, 30, 'a document keeps the unit the service speaks, seconds');
assert.equal(document.runs[0].interrupted, true);
assert.equal(document.runs[0].passage, 'def total\n  @sum = 1\nend', 'a saved passage travels with the run');
assert.equal(document.runs[1].rawWpm, 84);
assert.equal(document.runs[1].publicSlug, 'ABCDEFGH');

// Round trip: a document reads back as the runs it was written from.
const reread = model.readHistoryDocument(model.historyDocumentText(state));
assert.equal(reread.error, '');
assert.deepEqual(reread.document.runs, JSON.parse(JSON.stringify(document.runs)));
const restored = model.parseState(JSON.stringify(reread.document));
assert.equal(restored.runs.length, 2);
assert.equal(restored.bestWpm, 80, 'a paused run never becomes a best');
assert.deepEqual(JSON.parse(JSON.stringify(restored.keyMistakes)), { e: 4 });

// The same document imported twice adds nothing the second time.
const mergedOnce = model.mergeHistory(model.emptyState(), model.historyDocumentText(state));
assert.equal(mergedOnce.error, '');
assert.equal(mergedOnce.added, 2);
const mergedTwice = model.mergeHistory(mergedOnce.state, model.historyDocumentText(state));
assert.equal(mergedTwice.error, '');
assert.equal(mergedTwice.added, 0, 'importing a document twice must not duplicate runs');
assert.equal(mergedTwice.state.runs.length, 2);

// Older shapes still read: a bare native state at every version the desktop has written.
for (const version of [1, 2, 3, 4, 5, 6]) {
  const read = model.readHistoryDocument(JSON.stringify({ version, runs: [run()], keyMistakes: { e: 3 } }));
  assert.equal(read.error, '', `version ${version} must still read`);
  assert.equal(read.document.runs.length, 1);
  assert.equal(read.document.keyMistakes.e, 3, 'aggregates ride along with a native state');
}

// A browser backup converts field by field, and keeps what the browser recorded for itself.
const browserBackup = JSON.stringify({
  format: 'typearchy-practice', version: 1,
  runs: [{
    id: 'browser-fixture', timestamp: '2026-09-05T12:00:00.000Z', mode: 'code', target: 'RUBY / 30 SEC',
    challengeKey: 'code:ruby:fixture', engineVersion: '2026.08.2', durationMs: 30000,
    wpm: 70, raw: 74, accuracy: 97, consistency: 90, errors: 2, pace: [60, 70], interrupted: true,
    weakKeys: ['E', 'R'], weakPairs: ['E→X'], passage: 'puts :ok',
  }],
});
const browserRead = model.readHistoryDocument(browserBackup);
assert.equal(browserRead.error, '');
const browserRun = model.parseState(JSON.stringify(browserRead.document)).runs[0];
assert.equal(browserRun.duration, 30, 'durationMs converts to seconds');
assert.equal(browserRun.rawWpm, 74, 'raw converts to rawWpm');
assert.equal(browserRun.contentVersion, '2026.08.2');
assert.equal(browserRun.id, 'browser-fixture');
assert.deepEqual(JSON.parse(JSON.stringify(browserRun.weakKeys)), ['E', 'R'], 'trouble spots survive the trip');
assert.deepEqual(JSON.parse(JSON.stringify(browserRun.weakPairs)), ['E→X']);
assert.equal(model.parseState(JSON.stringify(browserRead.document)).bestWpm, 0,
  'an interrupted import never becomes a personal best');

// Rejections: a corrupt or unsupported file must never import part of itself.
const rejected = [
  'not json',
  'null',
  '[]',
  JSON.stringify({ format: model.HISTORY_FORMAT, version: 2, runs: [] }),
  JSON.stringify({ format: model.HISTORY_FORMAT, version: 1 }),
  JSON.stringify({ format: 'typearchy-practice', version: 2, runs: [] }),
  JSON.stringify({ format: 'typearchy-practice', version: 1, runs: [{ id: 'x' }] }),
  JSON.stringify({ version: 7, runs: [] }),
  JSON.stringify({ version: 6 }),
  JSON.stringify({}),
];
for (const raw of rejected) {
  const read = model.readHistoryDocument(raw);
  assert.ok(read.error, `${raw.slice(0, 48)} must be rejected`);
  assert.equal(read.document, null);
  const merged = model.mergeHistory(state, raw);
  assert.ok(merged.error, 'mergeHistory reports the same rejection');
  assert.equal(merged.state, state, 'a rejected import leaves the state untouched');
  assert.equal(merged.added, 0);
}

// Duplicate ids and impossible numbers reject the whole backup, not just the bad run.
for (const broken of [
  { ...JSON.parse(browserBackup), runs: [...JSON.parse(browserBackup).runs, JSON.parse(browserBackup).runs[0]] },
  { ...JSON.parse(browserBackup), runs: [{ ...JSON.parse(browserBackup).runs[0], wpm: 90000 }] },
  { ...JSON.parse(browserBackup), runs: [{ ...JSON.parse(browserBackup).runs[0], timestamp: 'never' }] },
]) {
  const read = model.readHistoryDocument(JSON.stringify(broken));
  assert.match(read.error, /invalid or duplicate runs/);
  assert.equal(read.document, null);
}

// An empty history still writes a valid document.
const empty = model.readHistoryDocument(model.historyDocumentText(model.emptyState()));
assert.equal(empty.error, '');
assert.equal(empty.document.runs.length, 0);

// A document that claims to be ours but is not, and runs that are not records, must never become
// history. Shapes that cannot be records are rejected at read; a record-shaped run with no usable
// timestamp is reported as skipped instead of being appended as a sprint:0 entry.
const malformed = [
  JSON.stringify({ format: model.HISTORY_FORMAT, version: true, runs: [] }),
  JSON.stringify({ format: model.HISTORY_FORMAT, version: '1', runs: [] }),
  JSON.stringify({ format: model.HISTORY_FORMAT, version: 1, runs: [{}] }),
  JSON.stringify({ format: model.HISTORY_FORMAT, version: 1, runs: [{ mode: 'sprint' }] }),
  JSON.stringify({ format: model.HISTORY_FORMAT, version: 1, runs: [null] }),
  JSON.stringify({ format: model.HISTORY_FORMAT, version: 1, runs: [[]] }),
  JSON.stringify({ format: model.HISTORY_FORMAT, version: 1, runs: ['run'] }),
];
for (const raw of malformed) {
  const read = model.readHistoryDocument(raw);
  const merged = model.mergeHistory(model.emptyState(), raw);
  assert.equal(merged.added, 0, `${raw.slice(0, 60)} must add nothing`);
  assert.equal(merged.state.totalTests, 0, 'no phantom run may reach local history');
  assert.equal(merged.state.runs.length, 0);
  assert.equal(merged.state.bestWpm, 0);
  if (!read.error) assert.ok(merged.skipped > 0, 'a run that is not a record is reported as skipped');
}
for (const raw of malformed.slice(0, 2).concat(malformed.slice(4))) {
  const read = model.readHistoryDocument(raw);
  assert.ok(read.error, `${raw.slice(0, 60)} must be rejected at read`);
  assert.equal(read.document, null);
}

// A run with no usable timestamp can never be ordered or matched, so it is reported and left out
// instead of being appended as a sprint:0 entry.
const timestampLess = model.mergeHistory(model.emptyState(), JSON.stringify({
  version: 6,
  runs: [run(), { mode: 'sprint', challengeKey: 'sprint:0' }],
}));
assert.equal(timestampLess.error, '');
assert.equal(timestampLess.added, 1);
assert.equal(timestampLess.skipped, 1);
assert.equal(timestampLess.state.runs.length, 1);
assert.equal(timestampLess.state.totalTests, 1);
assert.deepEqual(timestampLess.state.runs.map((entry) => entry.challengeKey), ['sprint:30']);

// An implausible run never becomes a personal best, and never costs the rest of the file.
const mixed = model.mergeHistory(model.emptyState(), JSON.stringify({
  version: 6,
  runs: [
    run({ timestamp: '2026-09-03T10:00:00Z', challengeKey: 'sprint:60', wpm: 900 }),
    run({ timestamp: '2026-09-04T10:00:00Z', challengeKey: 'sprint:15', wpm: 1728 }),
    run({ timestamp: '2026-09-05T10:00:00Z', challengeKey: 'sprint:120', wpm: 1000, rawWpm: 1200 }),
  ],
}));
assert.equal(mixed.error, '');
assert.equal(mixed.added, 2, 'the plausible runs are imported');
assert.equal(mixed.skipped, 1, 'the implausible run is reported, not imported');
assert.equal(mixed.state.bestWpm, 1000, 'a junk run never sets a personal best');
assert.equal(mixed.state.totalTests, 2);
assert.deepEqual(mixed.state.runs.map((entry) => entry.challengeKey), ['sprint:120', 'sprint:60']);
assert.equal(model.plausibleRun({ timestamp: '2026-09-05T10:00:00Z', wpm: 1000 }), true);
assert.equal(model.plausibleRun({ timestamp: '2026-09-05T10:00:00Z', wpm: 1000.5 }), false);
assert.equal(model.plausibleRun({ timestamp: '2026-09-05T10:00:00Z', rawWpm: 2001 }), false);
assert.equal(model.plausibleRun({ timestamp: '2026-09-05T10:00:00Z', accuracy: 101 }), false);
assert.equal(model.plausibleRun({ timestamp: 'nope' }), false);
assert.equal(model.plausibleRun({}), false);

console.log(`history document: format ${model.HISTORY_FORMAT} ${model.HISTORY_VERSION}, ${rejected.length + malformed.length} rejected shapes, timestamp-less and implausible runs skipped, both legacy formats still read`);
