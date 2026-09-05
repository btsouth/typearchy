import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { learningState, learningRecord, learningNormalize, learningProfile } from '../app/learningEngine.js';

test('native and browser learning use the same implementation', () => {
  const native = readFileSync(new URL('../../LearningEngine.js', import.meta.url),'utf8').replace(/^\.pragma library\s*/, '').trim();
  const browser = readFileSync(new URL('../app/learningEngine.js', import.meta.url),'utf8').replace(/^\/\/ Generated[^\n]*\n/, '').replace(/\nexport \{[^}]*\}\s*$/, '').trim();
  assert.equal(browser,native);
});
test('suggestions use mistake rates rather than rewarding common letters with more practice', () => {
  const state = learningState();
  for(let i=0;i<100;i++) learningRecord(state,'e','h',i>=8);
  for(let i=0;i<10;i++) learningRecord(state,'r','t',i>=3);
  const profile=learningProfile([{learning:state}]);
  assert.equal(profile.keys[0].key,'r');
  assert.equal(profile.keys[0].attempts,10);
  assert.equal(profile.keys[0].errors,3);
  assert.equal(profile.keys[0].accuracy,70);
  assert.equal(profile.pairs[0].key,'t→r');
});
test('single mistakes, unmeasured legacy runs, and clean typing do not invent weaknesses', () => {
  const state=learningState();learningRecord(state,'x','e',false);
  for(let i=0;i<100;i++) learningRecord(state,'a','s',true);
  assert.equal(learningProfile([{learning:state}]).keys.length,0);
  const isolated=learningState();
  for(let i=0;i<100;i++) learningRecord(isolated,'e','r',i!==0);
  assert.equal(learningProfile([{learning:isolated}]).keys.length,0);
  assert.equal(learningProfile([{weakKeys:['X']}]).sampledRuns,0);
  assert.equal(learningProfile([{weakKeys:['X']}]).calibrating,true);
});
test('correction attempts are counted honestly and corrupt imported evidence is dropped', () => {
  const state=learningState();learningRecord(state,':','e',false);learningRecord(state,':','e',true);
  assert.deepEqual(Object.entries(state.keys),[[':',{attempts:2,errors:1}]]);
  assert.deepEqual(learningNormalize({version:1,keys:{e:{attempts:1,errors:2},r:{attempts:Infinity,errors:0}},pairs:{}}),learningState());
  assert.equal(learningProfile(Array.from({length:20},()=>({learning:state}))).sampledRuns,12);
});
