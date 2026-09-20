import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePracticeHistory, parsePracticeBackup, practiceHistoryDocument, mergePracticeHistory, practiceGroup, type PracticeRun } from '../app/lib/practiceHistory.ts';
import { historyDocumentText, readHistoryDocument } from '../app/practiceModel.js';
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
  assert.equal(normalizePracticeHistory(Array.from({length:600},(_,index)=>({...run,id:String(index)}))).length,600);
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

test('the browser exports one document, and reads it back with everything intact', () => {
  const timed = { ...run, durationMs: 30000 };
  const document = JSON.parse(practiceHistoryDocument([timed]));
  assert.equal(document.format, 'typearchy-history');
  assert.equal(document.version, 1);
  assert.equal(document.runs.length, 1);
  assert.equal(document.runs[0].duration, 30, 'seconds, the unit the service speaks');
  assert.equal(document.runs[0].rawWpm, 74, 'rawWpm, the name the service speaks');
  assert.equal(document.runs[0].contentVersion, '2026.08.2');
  assert.deepEqual(document.runs[0].weakKeys, ['r']);

  const imported = parsePracticeBackup(practiceHistoryDocument([timed]));
  assert.deepEqual(imported.map(entry => entry.id), [run.id]);
  assert.equal(imported[0].durationMs, 30000);
  assert.equal(imported[0].raw, 74);
  assert.equal(imported[0].engineVersion, '2026.08.2');
  assert.deepEqual(imported[0].weakKeys, ['r']);

  const shared = readHistoryDocument(practiceHistoryDocument([timed])) as { error?: string; document?: { runs?: unknown[] } };
  assert.equal(shared.error, '');
  assert.equal(shared.document?.runs?.length, 1);
});

test('a document the desktop wrote imports with its identifiers, links, and trouble spots', () => {
  const desktopRecord = { id:'desktop-run', timestamp:'2026-09-06T12:00:00Z', mode:'code', target:'RUBY / 30 SEC',
    challengeKey:'code:ruby:fixture', contentVersion:'2026.08.2', duration:30, wpm:70, rawWpm:74, accuracy:97,
    consistency:90, errors:2, pace:[60,70], interrupted:true, publicSlug:'ABCDEFGH', publicPinned:true,
    weakKeys:['E','R'], weakPairs:['E→X'] };
  const imported = parsePracticeBackup(historyDocumentText({ runs:[desktopRecord] }));
  assert.equal(imported.length, 1);
  assert.equal(imported[0].id, 'desktop-run');
  assert.equal(imported[0].durationMs, 30000);
  assert.equal(imported[0].publicSlug, 'ABCDEFGH');
  assert.equal(imported[0].publicPinned, true);
  assert.equal(imported[0].interrupted, true);
  assert.deepEqual(imported[0].weakKeys, ['E','R']);
  assert.deepEqual(imported[0].weakPairs, ['E→X']);
  // A run with no identifier of its own still gets one, and stays unique.
  const anonymous = parsePracticeBackup(historyDocumentText({ runs:[{ ...desktopRecord, id:'' }] }));
  assert.equal(anonymous[0].id, 'desktop:2026-09-06T12:00:00Z:code');
});
