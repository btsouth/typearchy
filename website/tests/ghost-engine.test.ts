import assert from 'node:assert/strict';
import test from 'node:test';
import { cumulativeWordsAt, paceAt, racePosition, replayProgress } from '../app/u/[handle]/ghostEngine.ts';

test('pace interpolates continuously instead of jumping between samples', () => {
  assert.equal(paceAt([60, 120], 0), 60);
  assert.equal(paceAt([60, 120], 0.25), 75);
  assert.equal(paceAt([60, 120], 0.5), 90);
  assert.equal(paceAt([60, 120], 1), 120);
});

test('word progress integrates each pace sample', () => {
  assert.equal(cumulativeWordsAt([60, 120], 0, 30), 0);
  assert.equal(cumulativeWordsAt([60, 120], 0.5, 30), 15);
  assert.equal(cumulativeWordsAt([60, 120], 1, 30), 45);
});

test('race positions stay on the track', () => {
  assert.equal(racePosition(0, 50), 0);
  assert.equal(racePosition(25, 50), 48.5);
  assert.equal(racePosition(60, 50), 97);
});

test('replay progress advances from its actual origin without a midpoint jump', () => {
  assert.equal(replayProgress(1_000, 1_000, 15_000), 0);
  assert.equal(replayProgress(1_000, 1_300, 15_000), 0.02);
  assert.equal(replayProgress(1_000, 2_000, 15_000), 1 / 15);
  assert.equal(replayProgress(1_000, 20_000, 15_000), 1);
});
