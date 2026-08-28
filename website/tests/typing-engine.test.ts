import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ASSISTED_CHARACTER,
  MISSING_CHARACTER,
  advanceLineBreaks,
  alignCharacter,
  countCorrectCharacters,
  eraseInput,
  isCorrectCharacter,
} from '../app/typingEngine.ts';

test('a skipped space records one miss and immediately realigns', () => {
  const result = alignCharacter('one two', 'one', 't');
  assert.deepEqual(result, { text: `one${MISSING_CHARACTER}t`, expected: ' ', correct: false });
  assert.equal(alignCharacter('one two', result.text, 'w').correct, true);
});

test('an accidental duplicate key does not advance the prompt', () => {
  assert.deepEqual(alignCharacter('hello', 'he', 'e'), { text: 'he', expected: 'l', correct: false });
});

test('normal modes automatically consume line breaks', () => {
  assert.equal(advanceLineBreaks('quote', 'one\ntwo', 'one', 'e'), `one${ASSISTED_CHARACTER}`);
});

test('technical modes require one enter and skip blank separators', () => {
  assert.equal(advanceLineBreaks('code', 'one\ntwo', 'one', 'e'), 'one');
  assert.equal(advanceLineBreaks('code', 'one\ntwo', 'one\n', '\n'), 'one\n');
  assert.equal(advanceLineBreaks('shell', 'one\n\ntwo', 'one\n', '\n'), `one\n${ASSISTED_CHARACTER}`);
});

test('technical modes auto-indent after a valid enter', () => {
  assert.equal(
    advanceLineBreaks('code', 'build() {\n\tlocal path=$1', 'build() {\n', '\n'),
    `build() {\n${ASSISTED_CHARACTER}`,
  );
  assert.equal(
    advanceLineBreaks('shell', 'if ready; then\n  deploy', 'if ready; then\n', '\n'),
    `if ready; then\n${ASSISTED_CHARACTER}${ASSISTED_CHARACTER}`,
  );

  const prompt = 'build_manifest() {\n\tlocal path=$1';
  const enteredBreak = alignCharacter(prompt, 'build_manifest() {', '\n');
  const advancedBreak = advanceLineBreaks('code', prompt, enteredBreak.text, '\n');
  assert.equal(enteredBreak.correct, true);
  assert.equal(advancedBreak, `build_manifest() {\n${ASSISTED_CHARACTER}`);
  assert.equal(alignCharacter(prompt, advancedBreak, 'l').correct, true);
});

test('assisted breaks render complete without adding to WPM characters', () => {
  assert.equal(isCorrectCharacter('\n', ASSISTED_CHARACTER), true);
  assert.equal(countCorrectCharacters('one\ntwo', `one${ASSISTED_CHARACTER}two`), 6);
});

test('backspace crosses an assisted break and removes the previous input', () => {
  assert.equal(eraseInput(`one${ASSISTED_CHARACTER}`, false), 'on');
  assert.equal(eraseInput(`one${ASSISTED_CHARACTER}`, true), '');
});
