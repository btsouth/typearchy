import assert from 'node:assert/strict';
import test from 'node:test';
import { sharedChallengeFromKey } from '../app/lib/sharedPractice.ts';

test('untimed coding drills recreate the exact original code and input rules', () => {
  for (const key of ['code:ruby:30:generated:code:ruby:example', 'shell:60:generated:shell:example']) {
    const original = sharedChallengeFromKey(key)!;
    const drill = sharedChallengeFromKey(`drill:${key}`)!;
    assert.ok(original.prompt.length > 100);
    assert.equal(drill.prompt, original.prompt);
    assert.equal(drill.inputMode, original.mode);
    assert.equal(drill.mode, 'drill');
    assert.match(drill.target, /UNTIMED$/);
    assert.equal(sharedChallengeFromKey(`drill:drill:${key}`), null);
  }
});

test('old prose drill links remain reproducible alongside the new story collection', () => {
  const old = sharedChallengeFromKey('drill:r:0-1');
  const current = sharedChallengeFromKey('drill:v3:r:0-1');
  assert.ok(old && current);
  assert.notEqual(old.prompt, current.prompt);
  assert.equal(old.version, 'drill-v2');
  assert.equal(current.version, 'drill-v3');
  assert.equal(sharedChallengeFromKey('drill:v3:r:999'), null);
});
