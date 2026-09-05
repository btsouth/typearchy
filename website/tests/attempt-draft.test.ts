import assert from 'node:assert/strict';
import test from 'node:test';
import { readAttemptDraft, writeAttemptDraft, type AttemptDraft } from '../app/lib/attemptDraft.ts';
import { competitionReplay } from '../app/competitionEngine.js';
const passage = 'Clear feedback makes deliberate practice useful.';
const events = Array.from(passage).map((text, index) => ({ type: 'input' as const, text, at: index * 100 }));
const rules = { version: 'competition-1', finish: 'passage', correction: 'required', autoIndent: false };
const score = competitionReplay(passage, rules, events);
const draft: AttemptDraft = { session: { id: 'local-test', token: 'a'.repeat(64), contentHash: 'hash', expiresAt: Date.now() + 1200000 }, score, events, saved: false, published: null, updatedAt: Date.now() };
function storage() {
  const values = new Map<string,string>();
  return { getItem: (key: string) => values.get(key) || null, removeItem: (key: string) => { values.delete(key); }, setItem: (key: string, value: string) => { values.set(key,value); } };
}
test('unfinished upload survives reload, then acknowledgement removes all raw input', () => {
  const store = storage();
  assert.equal(writeAttemptDraft(store,'slug',draft),true);
  assert.deepEqual(readAttemptDraft(store,'slug','hash'),draft);
  writeAttemptDraft(store,'slug',{ ...draft, saved: true });
  assert.deepEqual(readAttemptDraft(store,'slug','hash')?.events,[]);
  assert.deepEqual(readAttemptDraft(store,'slug','hash')?.score,score);
});
test('expired or mismatched drafts cannot restore against a different passage', () => {
  const store = storage();
  writeAttemptDraft(store,'slug',draft);
  assert.equal(readAttemptDraft(store,'slug','changed'),null);
  writeAttemptDraft(store,'slug',{ ...draft, updatedAt: Date.now() - 86400001 });
  assert.equal(readAttemptDraft(store,'slug','hash'),null);
  store.setItem('typearchy.attempt.slug','malformed');
  assert.equal(readAttemptDraft(store,'slug','hash'),null);
  assert.equal(writeAttemptDraft({setItem() { throw new Error('Storage denied'); }},'slug',draft),false);
});
