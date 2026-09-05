import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseChallenge } from '../app/lib/challengeContract.ts';
const prose = JSON.parse(readFileSync(new URL('../../corpus/prose.json',import.meta.url),'utf8')) as { id:string; title:string; passage:string; language:string; attribution:string }[];
test('new prose has one canonical corpus and remains usable as reviewed challenges',()=>{
  assert.deepEqual(prose,JSON.parse(readFileSync(new URL('../app/practicePassages.json',import.meta.url),'utf8')));
  const context = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../../PracticePassages.js',import.meta.url),'utf8').replace(/^\.pragma library\s*/,''),context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.PASSAGES)),prose.map(item=>item.passage));
  assert.equal(new Set(prose.map(item=>item.id)).size,prose.length);
  for(const item of prose) assert.equal(parseChallenge({...item,autoIndent:false,visibility:'public'}).passage,item.passage);
});
