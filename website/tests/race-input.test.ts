import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { firstMistake, raceProgress, tabIndent } from '../app/lib/raceInput.ts';
import { competitionState, competitionStep, competitionResult } from '../app/competitionEngine.js';

const rules = { version: 'competition-1', finish: 'passage', correction: 'required', autoIndent: true };
const snippets = JSON.parse(readFileSync(new URL('../app/rubySnippets.json', import.meta.url), 'utf8'));
const passage: string = snippets.find((snippet: {id: string}) => snippet.id === 'rails-request-limiter-2024').passage;

test('an incomplete or incorrect 344/345-character race never displays 100%', () => {
  assert.equal(raceProgress(344, 345, false), 99);
  assert.equal(raceProgress(345, 345, true), 100);
});

test('the full Rails passage auto-indents after every newline, including the blank line, and finishes on the last d', () => {
  const state = competitionState(passage, rules);
  let at = 0;
  while (state.finishedAt === null) {
    const next = state.passage[state.typed.length];
    competitionStep(state, {type:'input', text:next, at}); at += 50;
    if (next === '\n') assert.notEqual(state.passage[state.typed.length], ' ');
  }
  assert.equal(state.typed.join(''), passage);
  assert.equal(state.wrong, 0);
  assert.equal(competitionResult(state).durationMs, at - 50);
  assert.throws(() => competitionStep(state, {type:'input', text:'x', at}), /already finished/);
});

test('a hidden wrong space can be found, erased and corrected without discarding the recording', () => {
  const state = competitionState(passage, rules);
  let at = 0;
  while (state.typed.length < state.passage.length) {
    const index = state.typed.length;
    competitionStep(state, {type:'input', text:index === 3 ? '_' : state.passage[index], at}); at += 50;
  }
  assert.equal(state.finishedAt, null);
  assert.equal(raceProgress(state.correct + state.assistedCount, state.passage.length, false), 99);
  const wrong = firstMistake(state.passage, state.typed);
  assert.equal(wrong, 3);
  while (state.typed.length > wrong) { competitionStep(state, {type:'backspace', at}); at += 50; }
  while (state.finishedAt === null) { competitionStep(state, {type:'input', text:state.passage[state.typed.length], at}); at += 50; }
  assert.equal(competitionResult(state).errors, 1);
});

test('Tab never duplicates automatic indentation and only fills manual leading spaces', () => {
  const chars = Array.from('first\n    second');
  assert.equal(tabIndent(chars, Array.from('first\n'), true), '');
  assert.equal(tabIndent(chars, Array.from('first\n'), false), '    ');
  assert.equal(tabIndent(chars, Array.from('first\n  '), false), '  ');
  assert.equal(tabIndent(chars, Array.from('first\n    sec'), false), '');
  assert.equal(tabIndent(chars, Array.from('wrong\n'), false), '');
});
