import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePracticeHistory, parsePracticeBackup, mergePracticeHistory, practiceGroup, type PracticeRun } from '../app/lib/practiceHistory.ts';
const run: PracticeRun = {id:'one',timestamp:'2026-09-04T12:00:00Z',mode:'sprint',target:'PROSE / 30 SEC',wpm:70,raw:74,accuracy:97,consistency:90,errors:2,pace:[60,70],weakKeys:['r'],challengeKey:'sprint:prose:30:generated:prose:one',engineVersion:'2026.08.2'};
test('history migration preserves valid runs while rejecting broken storage',()=>{
  const result=normalizePracticeHistory([run,{...run,id:'broken',accuracy:101},null,{...run,id:'future',wpm:Infinity}]);
  assert.equal(result.length,1); assert.equal(result[0].wpm,70); assert.equal(result[0].timestamp,'2026-09-04T12:00:00.000Z');
});
test('backup imports merge unique IDs, retain newer history, and reject invalid files atomically',()=>{
  const incoming={...run,id:'two',timestamp:'2026-09-05T12:00:00Z'};
  const backup=JSON.stringify({format:'typearchy-practice',version:1,runs:[incoming]});
  assert.deepEqual(mergePracticeHistory([run],parsePracticeBackup(backup)).map(run=>run.id),['two','one']);
  assert.equal(mergePracticeHistory([run],[run]).length,1);
  assert.throws(()=>parsePracticeBackup(JSON.stringify({format:'typearchy-practice',version:1,runs:[incoming,{}]})),/Nothing was imported/);
  assert.throws(()=>parsePracticeBackup('{'),/valid JSON/);
});
test('personal bests never mix languages, durations, content versions, or custom passages',()=>{
  for(const other of [{...run,target:'WORDS / 30 SEC'},{...run,target:'PROSE / 60 SEC'},{...run,engineVersion:'old'}]) assert.notEqual(practiceGroup(run),practiceGroup(other));
  const custom={...run,mode:'custom' as const};
  assert.notEqual(practiceGroup(custom),practiceGroup({...custom,challengeKey:'different passage'}));
  assert.equal(normalizePracticeHistory(Array.from({length:600},(_,index)=>({...run,id:String(index)}))).length,500);
});

test('desktop backups preserve paused runs, public links, and browser IDs across a round trip', () => {
  const desktop = {version:6,runs:[{id:run.id,timestamp:run.timestamp,mode:run.mode,target:run.target,
    challengeKey:run.challengeKey,contentVersion:run.engineVersion,duration:30,wpm:70,rawWpm:74,
    accuracy:97,consistency:90,errors:2,pace:[60,70],interrupted:true,publicSlug:'ABCDEFGH'}]};
  const imported = parsePracticeBackup(JSON.stringify(desktop));
  assert.equal(imported[0].id, run.id);
  assert.equal(imported[0].interrupted, true);
  assert.equal(imported[0].durationMs, 30000);
  assert.equal(imported[0].publicSlug, 'ABCDEFGH');
  assert.equal(mergePracticeHistory([run], imported).length, 1);
  assert.equal(mergePracticeHistory([run], [{...imported[0],id:'different-client-id'}]).length, 1);
  assert.throws(() => parsePracticeBackup(JSON.stringify({...desktop,runs:[null]})), /Nothing was imported/);
  assert.throws(() => parsePracticeBackup(JSON.stringify({...desktop,runs:[{...desktop.runs[0],wpm:-1}]})), /Nothing was imported/);
});
