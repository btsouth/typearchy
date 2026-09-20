// The browser copy of the practice model is generated from TypearchyModel.js by
// bin/sync-practice-model.mjs. This test is the proof that the desktop app and the site score,
// store, and describe a run the same way, so a change on one side cannot quietly change what a
// score means on the other.

import assert from 'node:assert/strict';
import { declaredNames, loadQmlLibrary } from './qml-library.mjs';
import * as browserModel from '../website/app/practiceModel.js';

const imported = [];
const desktopModel = loadQmlLibrary(new URL('../TypearchyModel.js', import.meta.url), imported);

// Results cross a realm boundary, so both sides are reduced to plain JSON before comparison.
const plain = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

function outcome(library, name, args) {
  try {
    return { value: plain(library[name](...args.map((argument) => structuredClone(argument)))) };
  } catch (error) {
    return { threw: String((error && error.message) || error) };
  }
}

let comparisons = 0;

function parity(name, ...args) {
  assert.equal(typeof desktopModel[name], 'function', `${name} must exist in TypearchyModel.js`);
  assert.equal(typeof browserModel[name], 'function', `${name} must exist in the generated model`);
  const desktop = outcome(desktopModel, name, args);
  const browser = outcome(browserModel, name, args);
  assert.deepEqual(browser, desktop, `${name} must behave the same in the browser copy`);
  comparisons += 1;
  return desktop.value;
}

// The generated module must expose exactly what the source declares, no more and no less.
const sourceNames = declaredNames(desktopModel, imported).sort();
assert.deepEqual(Object.keys(browserModel).sort(), sourceNames,
  'the generated model must export every name TypearchyModel.js declares, and nothing else');
assert.deepEqual(plain(browserModel.MODES), plain(desktopModel.MODES));

const modes = plain(desktopModel.MODES);
const ASSISTED = plain(desktopModel.ASSISTED_CHARACTER);
const MISSING = plain(desktopModel.MISSING_CHARACTER);
const characters = [
  ...'azAZ09 .,;:!?-_/\\\'"()[]{}<>=+*',
  '\n', '\t', '\u0000', '\u0001', 'é', '→',
];
const prompts = [
  'the quick brown fox jumps',
  'line one\nline two\n\nline four',
  '  indented\n\ttabbed  ',
  'def total(items)\n  @sum = items.sum\nend',
  'gc collect --threads=4 | tee /var/log/gc.log',
];

// Input alignment decides every score, so the whole matrix of prefixes and characters is compared.
for (const prompt of prompts) {
  for (let length = 0; length <= prompt.length; length += 1) {
    const typed = prompt.slice(0, length);
    parity('correctCharacters', prompt, typed);
    parity('documentPosition', prompt, typed.length);
    parity('eraseWordIndex', typed);
    for (const character of characters) parity('alignCharacter', prompt, typed, character);
  }
}

// Line breaks, assisted indentation, and erase rules differ per mode.
for (const mode of [...modes, 'shell', 'code']) {
  for (const prompt of [prompts[1], prompts[3], prompts[4]]) {
    for (let length = 0; length <= prompt.length; length += 1) {
      const typed = prompt.slice(0, length);
      for (const character of ['a', ' ', '\n', '\t', '{', 'ú']) {
        parity('advanceLineBreaks', mode, prompt, typed, character);
      }
      parity('eraseWordIndex', typed);
    }
  }
}

for (const typed of ['', 'abc', 'ab\u0001\u0001', '\u0001\u0001', 'two words here', 'trailing ', 'a\n\u0001b']) {
  parity('eraseWordIndex', typed);
}

// Backspace and the per-character state the browser renders.
for (const prompt of prompts) {
  for (let length = 0; length <= prompt.length; length += 1) {
    const typed = prompt.slice(0, length);
    parity('eraseInput', typed, false);
    parity('eraseInput', typed, true);
    for (const character of [prompt[length], ASSISTED, MISSING, 'a', '\n', '\t', '']) {
      parity('isCorrectCharacter', prompt[length], character);
    }
  }
}
for (const typed of ['', '\u0001', 'two words here', '  leading', 'trailing  ', 'a\u0001\u0001b', 'a\n\u0001b', '\u0001\u0001\u0001']) {
  parity('eraseInput', typed, false);
  parity('eraseInput', typed, true);
}

// Scoring.
for (const characters_ of [0, 1, 5, 100, 250, 1_500]) {
  for (const elapsedMs of [1000, 30_000, 60_000, 600_000]) {
    parity('wordsPerMinute', characters_, elapsedMs);
  }
  parity('wordsPerMinute', characters_, 0);
}
for (const [keypresses, incorrect] of [[0, 0], [1, 0], [100, 3], [100, 100], [250, 1], [250, 375]]) {
  parity('accuracy', keypresses, incorrect);
}
for (const samples of [[], [80], [80, 80, 80], [40, 80, 120], [0, 0, 0], [12.5, 60, 300]]) {
  parity('consistency', samples);
}

// State documents, including the versions and shapes that must be rejected.
parity('emptyState');
parity('stateNeedsQuarantine', 'not json');
parity('stateNeedsQuarantine', JSON.stringify({ version: 7, runs: [] }));
parity('parseState', 'not json');
parity('parseState', JSON.stringify({ version: 7, runs: [] }));
parity('parseState', JSON.stringify({ version: 6, runs: 'many' }));
parity('parseState', JSON.stringify({ version: 6 }));
for (const version of [1, 2, 3, 4, 5, 6]) {
  parity('parseState', JSON.stringify({
    version,
    runs: [{ timestamp: '2026-08-28T12:00:00Z', mode: 'sprint', wpm: 70, accuracy: 96 }],
    keyMistakes: { e: 3 },
    bigramMistakes: { 'e→x': 1 },
    settings: { mode: 'daily' },
  }));
}
parity('parseState', JSON.stringify({
  version: 6,
  bestWpm: 900, totalTests: 1200, streak: 40, lastPlayedDate: '2026-12-31',
  keyMistakes: Object.fromEntries([...Array(200)].map((_, index) => [`k${index}`, index])),
  bigramMistakes: { 'a→b': 2, bad: 1, 'c→d': -5 },
  runs: Array.from({ length: 40 }, (_, index) => ({
    timestamp: new Date(Date.UTC(2026, 7, 1, 12, 0, index)).toISOString(),
    date: '2026-08-01', mode: index % 2 ? 'sprint' : 'code', duration: 30, wpm: 60 + index,
    accuracy: 95, consistency: 90, errors: index, challengeKey: `code:ruby:fixture-${index}`,
    passage: 'A saved passage.', interrupted: index % 5 === 0,
  })),
}));

const run = {
  timestamp: '2026-08-28T12:00:00Z', date: '2026-08-28', mode: 'daily', duration: 30,
  target: '#240', challengeKey: 'daily:240', contentVersion: '2026.08.2', characters: 200,
  wpm: 80, rawWpm: 84, accuracy: 97, consistency: 92, errors: 3, dailyId: '240',
  keyMistakes: { x: 2 }, bigramMistakes: { 'e→x': 1 }, pace: [72, 80, 86],
};
for (const input of [run, { ...run, mode: 'custom' }, { ...run, interrupted: true },
  { ...run, wpm: -5, accuracy: 250 }, {}, { mode: 'nonsense' }]) {
  parity('normalizeRun', input);
}

const built = ((state) => {
  let next = state;
  next = desktopModel.recordRun(next, run);
  next = desktopModel.recordRun(next, {
    timestamp: '2026-08-29T12:00:00Z', date: '2026-08-29', mode: 'sprint', duration: 30,
    target: '30 seconds', challengeKey: 'sprint:30', characters: 230, wpm: 92, rawWpm: 95,
    accuracy: 98, consistency: 94, errors: 2, pace: [80, 90, 95], keyMistakes: { e: 1 },
  });
  next = desktopModel.recordRun(next, {
    timestamp: '2026-08-29T13:00:00Z', date: '2026-08-29', mode: 'sprint', duration: 15,
    target: '15 seconds', challengeKey: 'sprint:15', characters: 120, wpm: 70, rawWpm: 74,
    accuracy: 94, consistency: 88, errors: 4, interrupted: true, learning: { version: 1, keys: { r: { attempts: 10, errors: 3 } }, pairs: {} },
  });
  return next;
})(desktopModel.emptyState());

// The document a client exports is the interchange format, so both sides must produce the same one.
assert.deepEqual(
  { ...plain(browserModel.historyDocument(built)), exportedAt: '' },
  { ...plain(desktopModel.historyDocument(built)), exportedAt: '' },
  'both clients must export the same history document',
);
assert.deepEqual(
  plain(browserModel.readHistoryDocument(desktopModel.historyDocumentText(built))),
  plain(desktopModel.readHistoryDocument(desktopModel.historyDocumentText(built))),
);

// The pace bounds both clients clamp to, and the service accepts the same ones.
assert.equal(browserModel.PACE_CEILING, desktopModel.PACE_CEILING);
assert.equal(browserModel.PACE_SAMPLE_LIMIT, 180);
assert.deepEqual(
  plain(browserModel.normalizeRun({ timestamp: '2026-09-05T10:00:00Z', pace: [1, 99999, -5, 250.5] }).pace),
  [1, 1000, 0, 250.5],
);
assert.equal(
  browserModel.normalizeRun({ timestamp: '2026-09-05T10:00:00Z', pace: Array.from({ length: 300 }, (_, index) => index) }).pace.length,
  180,
);

parity('recordRun', desktopModel.emptyState(), run);
parity('recordRun', built, { ...run, timestamp: '2026-08-30T12:00:00Z', date: '2026-08-30', wpm: 88 });
for (const [keyCounts, bigramCounts, expected, previous] of [
  [{}, {}, 'x', 'e'], [{ x: 1 }, {}, 'e', undefined], [{ x: 1 }, { 'e→x': 1 }, 'x', 'e'],
  [{ x: 1 }, {}, undefined, undefined], [{ '\n': 4 }, {}, ' ', 'a'],
]) {
  parity('addMistake', keyCounts, bigramCounts, expected, previous);
}
parity('sortedCounts', { a: 3, b: 9, c: 1, d: 3 }, 2);
parity('sortedCounts', {}, 5);
parity('capCounts', Object.fromEntries([...Array(200)].map((_, index) => [`k${index}`, index])), 128);
parity('normalizeCounts', { a: 2, b: -1, c: 'three', d: 0 });
parity('weakKeys', built, 4);
parity('drillProfile', built, 6);
parity('drillTargetErrors', { keyMistakes: { e: 6, x: 1 }, bigramMistakes: { 'e→x': 2 } }, { e: 6, x: 1 }, { 'e→x': 2 });

// Everything the practice UI and the history list read.
parity('modeBest', built, 'sprint');
parity('modeBest', built, 'quote');
parity('recentAverage', built, 'wpm', 2);
parity('recentAverage', built, 'accuracy', 3, 'sprint');
parity('latestRun', built);
parity('bestForDate', built, '2026-08-28');
parity('dailyRun', built, '240');
parity('filteredRuns', built, 'sprint', 10);
parity('filteredRuns', built, 'all', 2);
parity('recentTrend', built, 'all', 10);
parity('recentTrend', built, 'sprint', 1);
parity('bestComparableRun', built, { challengeKey: 'daily:240' });
parity('bestComparableRun', built, {});
parity('paceAt', desktopModel.latestRun(built), 2100);
parity('paceAt', desktopModel.latestRun(built), 0);
parity('updateRunPublication', built, desktopModel.latestRun(built).timestamp, 'ABCDEFGH', true);
parity('updateRunPublication', built, '2099-01-01T00:00:00Z', 'ZZZZZZZZ', true, 'sprint:15');
parity('clearRunPublications', built);
parity('daysBetween', '2026-08-28', '2026-09-05');
parity('daysBetween', '2026-08-28', '2026-08-28');
parity('dateKey', new Date('2026-08-28T23:00:00Z'));
parity('localDateKey', new Date('2026-08-28T12:00:00Z'));

// Result copy, which is what a player actually reads.
for (const shape of [
  desktopModel.latestRun(built),
  { mode: 'sprint', duration: 30, wpm: 92, accuracy: 98, pace: [80, 90, 95] },
  { mode: 'quote', target: 'CRAFT', wpm: 70, accuracy: 98 },
  { mode: 'custom', wpm: 40, accuracy: 90 },
  { mode: 'sprint', wpm: 99, previousBestWpm: 65, interrupted: true },
  { wpm: 70, accuracy: 97, previousBestWpm: 65, personalBest: true },
  {},
]) {
  parity('shareText', shape);
  parity('runBadge', shape);
  parity('resultStatus', shape);
  parity('comparison', shape);
  parity('nextAction', shape);
  parity('nextAction', shape, { connected: true, drillReady: true });
  parity('paceSparkline', shape.pace);
}
for (const [text, controlPressed, ageMs, autoRepeat] of [
  ['abc', false, 0, false], ['abc', false, 1000, false], ['abc', true, 0, false],
  ['abc', true, 0, true], ['', false, 0, false], ['a\u0001b', false, 400, false],
]) {
  parity('resultAction', text, controlPressed, ageMs, autoRepeat);
}
parity('mistakeLabel', ' ');
parity('mistakeLabel', '\n');
parity('mistakeLabel', 'x');
parity('compareVersions', '1.10.0', '1.4.0');
parity('compareVersions', '1.4.0', '1.4.0');
parity('validBackupNumber', 1, 6);
parity('validBackupNumber', '3', 6);
parity('validBackupNumber', Number.POSITIVE_INFINITY, 6);
parity('plausibleRun', { timestamp: '2026-09-05T10:00:00Z', wpm: 120 });
parity('plausibleRun', { timestamp: '2026-09-05T10:00:00Z', wpm: 1728 });
parity('plausibleRun', { timestamp: '', wpm: 120 });
parity('plausibleRun', {});
parity('plausibleRun', null);
parity('colorString', '#a1b2c3');
parity('colorString', 'red');
parity('escapeHtml', '<');
parity('escapeHtml', '&');
parity('escapeHtml', 'a');
parity('renderedPrompt', prompts[3], prompts[3].slice(0, 12), { correct: '#00ff00', missing: '#ff0000', pending: '#808080' });
parity('renderedPrompt', prompts[0], '', undefined);

// Importing history, both shapes, plus the files that must be rejected whole.
const localState = desktopModel.recordRun(desktopModel.emptyState(), {
  timestamp: '2026-09-01T10:00:00Z', date: '2026-09-01', mode: 'sprint', wpm: 50, accuracy: 96,
  challengeKey: 'merge:a', keyMistakes: { e: 2 },
});
const remoteState = desktopModel.recordRun(
  desktopModel.recordRun(desktopModel.emptyState(), {
    ...run, timestamp: '2026-09-02T10:00:00Z', date: '2026-09-02', mode: 'code', wpm: 80,
    accuracy: 99, challengeKey: 'merge:b', publicSlug: 'ABCDEFGH', publicPinned: true,
    keyMistakes: { e: 5, x: 1 },
  }),
  { timestamp: '2026-09-03T10:00:00Z', date: '2026-09-03', mode: 'sprint', wpm: 64, accuracy: 97, challengeKey: 'merge:c' },
);
parity('mergeHistory', localState, JSON.stringify(remoteState));
parity('mergeHistory', remoteState, JSON.stringify(remoteState));
parity('mergeHistory', localState, 'not json');
parity('mergeHistory', localState, JSON.stringify({ version: 99, runs: [] }));

const browserBackup = {
  format: 'typearchy-practice', version: 1,
  runs: [{
    id: 'browser-fixture', timestamp: '2026-09-05T12:00:00.000Z', mode: 'code', target: 'RUBY / 30 SEC',
    challengeKey: 'code:ruby:fixture', engineVersion: '2026.08.2', durationMs: 30000,
    wpm: 70, raw: 74, accuracy: 97, consistency: 90, errors: 2, pace: [60, 70], interrupted: true,
  }],
};
// A document carries an export timestamp, so parity strips it before comparing.
const historyDocumentOf = (state) => ({ ...plain(desktopModel.historyDocument(state)), exportedAt: '' });
const incomingRuns = () => [{
  timestamp: '2026-09-05T12:00:00.000Z', mode: 'sprint', target: '30 seconds', challengeKey: 'sprint:30',
  wpm: 80, rawWpm: 84, accuracy: 97, consistency: 92, errors: 2, duration: 30, contentVersion: '2026.08.2',
}];
const browserBackupWithWeakKeys = {
  ...browserBackup,
  runs: [{ ...browserBackup.runs[0], weakKeys: ['E', 'R'], weakPairs: ['E→X'] }],
};
parity('mergeHistory', desktopModel.emptyState(), JSON.stringify(browserBackup));
parity('mergeHistory', localState, JSON.stringify(browserBackup));
parity('mergeHistory', localState, JSON.stringify(historyDocumentOf(localState)));
parity('readHistoryDocument', 'not json');
parity('readHistoryDocument', JSON.stringify({ format: 'typearchy-history', version: 2, runs: [] }));
parity('readHistoryDocument', JSON.stringify({ format: 'typearchy-history', version: 1, runs: incomingRuns() }));
parity('readHistoryDocument', JSON.stringify(browserBackup));
parity('readHistoryDocument', JSON.stringify(browserBackupWithWeakKeys));
parity('readHistoryDocument', JSON.stringify({ version: 6, runs: incomingRuns() }));
parity('readHistoryDocument', JSON.stringify({ version: 1, runs: incomingRuns() }));
parity('readHistoryDocument', JSON.stringify({ version: 9, runs: [] }));
parity('readHistoryDocument', JSON.stringify({ format: 'typearchy-practice', version: 2, runs: [] }));
parity('browserBackupRuns', browserBackup);
parity('browserBackupRuns', { version: 1, runs: [...browserBackup.runs, {}] });
for (const broken of [
  { ...browserBackup, runs: [...browserBackup.runs, {}] },
  { ...browserBackup, runs: [browserBackup.runs[0], browserBackup.runs[0]] },
  { ...browserBackup, runs: [{ ...browserBackup.runs[0], wpm: 100_000 }] },
  { ...browserBackup, runs: [{ ...browserBackup.runs[0], timestamp: 'never' }] },
  { ...browserBackup, runs: [{ ...browserBackup.runs[0], mode: 'telepathy' }] },
]) {
  parity('mergeHistory', localState, JSON.stringify(broken));
}

assert.ok(comparisons > 3000, `expected a broad sweep, compared ${comparisons} calls`);
console.log(`practice model and browser copy agree across ${comparisons} compared calls`);
