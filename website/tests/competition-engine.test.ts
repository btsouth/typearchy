import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { competitionReplay, competitionState, competitionStep, competitionResult, COMPETITION_VERSION } from '../app/competitionEngine.js';

const passage = 'Clear feedback makes deliberate practice useful.';
const rules = { version: COMPETITION_VERSION, finish: 'passage', correction: 'required', autoIndent: false };
const recording = (text: string) => Array.from(text).map((text, index) => ({ type: 'input', text, at: index * 100 }));

test('desktop and web competition engines have exactly the same rules', () => {
  const desktop = readFileSync(new URL('../../CompetitionEngine.js', import.meta.url), 'utf8').replace(/^\.pragma library\s*/, '').trim();
  const web = readFileSync(new URL('../app/competitionEngine.js', import.meta.url), 'utf8')
    .replace(/^\/\/ Generated from[^\n]*\n/, '').replace(/\nexport \{[^\n]+\}\s*$/, '').trim();
  assert.equal(web, desktop);
});

test('complete recording produces deterministic scores without trusting client totals', () => {
  const score = competitionReplay(passage, rules, recording(passage));
  assert.equal(score.durationMs, (passage.length - 1) * 100);
  assert.equal(score.characters, passage.length);
  assert.equal(score.errors, 0);
  assert.equal(score.accuracy, 100);
  assert.equal(score.wpm, Math.round(passage.length * 120000 / score.durationMs) / 10);
  assert.deepEqual(score.progress.at(-1), [score.durationMs, passage.length]);
  assert.ok(score.progress.every((sample: number[]) => sample.length === 2 && sample.every(Number.isInteger)));
});

test('wrong characters require correction, and mistakes survive correction', () => {
  const state = competitionState(passage, rules);
  competitionStep(state, { type: 'input', text: 'X', at: 0 });
  assert.equal(state.wrong, 1);
  competitionStep(state, { type: 'backspace', at: 100 });
  for (const event of recording(passage)) competitionStep(state, { ...event, at: event.at + 200 });
  const result = competitionResult(state);
  assert.equal(result.errors, 1);
  assert.equal(result.characters, passage.length);
  assert.ok(result.accuracy < 100);
  assert.ok(result.rawWpm > result.wpm);
});

test('uncorrected errors and partial passages never count as a finish', () => {
  assert.throws(() => competitionReplay(passage, rules, recording('X' + passage.slice(1))), /Complete/);
  assert.throws(() => competitionReplay(passage, rules, recording(passage.slice(0, -1))), /Complete/);
});

test('indentation is excluded from score and backspace crosses assisted indentation', () => {
  const code = 'def greeting(name)\n  puts "Hello, #{name}!"\nend';
  const state = competitionState(code, { ...rules, autoIndent: true });
  recording('def greeting(name)\n').forEach(event => competitionStep(state, event));
  assert.equal(state.typed.join(''), 'def greeting(name)\n  ');
  competitionStep(state, { type: 'backspace', at: 1900 });
  assert.equal(state.typed.join(''), 'def greeting(name)');
  recording('\nputs "Hello, #{name}!"\nend').forEach(event => competitionStep(state, { ...event, at: event.at + 2000 }));
  assert.equal(competitionResult(state).characters, code.length - 2);
});

test('word erase works across whitespace and corrections', () => {
  const state = competitionState(passage, rules);
  recording('Clear feed').forEach(event => competitionStep(state, event));
  competitionStep(state, { type: 'word', at: 1000 });
  assert.equal(state.typed.join(''), 'Clear ');
  competitionStep(state, { type: 'word', at: 1100 });
  assert.equal(state.typed.length, 0);
  assert.equal(state.correct, 0);
});

test('Unicode code points use one input event and one character in scoring', () => {
  const text = 'Écrire avec précision 🙂 rend la pratique agréable.';
  const result = competitionReplay(text, rules, recording(text));
  assert.equal(result.characters, Array.from(text).length);
  assert.equal(result.accuracy, 100);
});

test('invalid clocks, rules, control characters, and post-finish events are rejected', () => {
  assert.throws(() => competitionState(passage, { ...rules, version: 'future' }), /Unsupported/);
  assert.throws(() => competitionState(passage + '\t', rules), /Invalid/);
  assert.throws(() => competitionReplay(passage, rules, [{ type: 'input', text: 'C', at: 1 }]), /time zero/);
  assert.throws(() => competitionReplay(passage, rules, [recording(passage)[0], { type: 'input', text: 'l', at: -1 }]), /timing/);
  assert.throws(() => competitionReplay(passage, rules, [{ type: 'input', text: passage, at: 0 }]), /one character/);
  assert.throws(() => competitionReplay(passage, rules, [...recording(passage), { type: 'backspace', at: 9000 }]), /already finished/);
  assert.throws(() => competitionReplay(passage, rules, recording(passage).map(event => ({ ...event, at: 0 }))), /Complete/);
});
