import assert from 'node:assert/strict';
import test from 'node:test';
import { parseChallenge, parseRecording, validateAttempt } from '../app/lib/challengeContract.ts';

const passage = 'Good practice rewards clear feedback and a steady rhythm.';
const input = { title: 'A steady rhythm', language: 'prose', passage, autoIndent: false, visibility: 'public' };

test('published challenges freeze normalized content and complete rules', () => {
  const challenge = parseChallenge({ ...input, passage: passage + '\r\n\t  next line   ' });
  assert.equal(challenge.passage, passage + '\n    next line');
  assert.equal(challenge.rules.correction, 'required');
  assert.equal(challenge.rules.finish, 'passage');
  assert.throws(() => parseChallenge({ ...input, passage: '<x>' }), /40/);
  assert.throws(() => parseChallenge({ ...input, autoIndent: 'yes' }), /indentation/);
  assert.throws(() => parseChallenge({ ...input, visibility: 'private' }), /public or unlisted/);
  assert.throws(() => parseChallenge({ ...input, title: 'Free WPM at typing-boost.xyz' }), /links out of the title/);
  assert.throws(() => parseChallenge({ ...input, title: 'See https://example.org' }), /links out of the title/);
  assert.equal(parseChallenge({ ...input, title: 'Rails 8.1 release notes' }).title, 'Rails 8.1 release notes');
  assert.equal(parseChallenge({ ...input, attribution: 'DHH. Rails (MIT). https://github.com/rails/rails' }).attribution, 'DHH. Rails (MIT). https://github.com/rails/rails');
});

test('recordings retain only known input fields and cannot report a future finish', () => {
  const events = parseRecording(Array.from(passage).map((text, index) => ({ type: 'input', text, at: index * 100, wpm: 999 })));
  assert.ok(events.every(event => !('wpm' in event)));
  const challenge = parseChallenge(input);
  assert.throws(() => validateAttempt(passage, challenge.rules, events, 0), /timing/);
  assert.equal(validateAttempt(passage, challenge.rules, events, 8000).characters, passage.length);
  assert.throws(() => parseRecording([{ type: 'paste', text: passage, at: 0 }]), /input/);
});
