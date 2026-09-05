import { learningNormalize } from '../learningEngine.js';
export type PracticeRun = {
  id: string; timestamp: string;
  mode: 'sprint' | 'words' | 'daily' | 'quote' | 'shell' | 'code' | 'focus' | 'drill' | 'custom';
  target: string; wpm: number; raw: number; accuracy: number; consistency: number; errors: number;
  pace: number[]; weakKeys: string[]; weakPairs?: string[]; drillKeys?: string[];
  drillBigrams?: string[]; targetErrors?: number; challengeKey: string; engineVersion: string;
  durationMs?: number; publicSlug?: string; interrupted?: boolean; completed?: boolean; publicPinned?: boolean;
  learning?: { version: number; keys: Record<string, { attempts: number; errors: number }>; pairs: Record<string, { attempts: number; errors: number }> };
  passage?: string;
  sprintStyle?: 'words' | 'prose';
};
const modes = new Set(['sprint','words','daily','quote','shell','code','focus','drill','custom']);
const number = (value: unknown, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
const text = (value: unknown, max: number) => typeof value === 'string' && value.length <= max;
const list = (value: unknown, max: number) => Array.isArray(value) ? value.filter(item => text(item,12)).slice(0,max) as string[] : [];
export function normalizePracticeHistory(input: unknown): PracticeRun[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>(); const results: PracticeRun[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object' || !text(item.id,100) || !item.id || seen.has(item.id)
      || !text(item.timestamp,40) || !Number.isFinite(Date.parse(item.timestamp)) || !modes.has(item.mode)
      || !text(item.target,200) || !text(item.challengeKey,500) || !text(item.engineVersion,80)
      || !number(item.wpm,1000) || !number(item.raw,2000) || !number(item.accuracy,100)
      || !number(item.consistency,100) || !number(item.errors,100000)) continue;
    seen.add(item.id);
    results.push({ id:item.id,timestamp:new Date(item.timestamp).toISOString(),mode:item.mode,
      interrupted:item.interrupted === true, completed:item.completed !== false, publicPinned:item.publicPinned === true,
      learning:learningNormalize(item.learning),
      passage:typeof item.passage === 'string' && item.passage.length <= 50000 ? item.passage : undefined,
      durationMs:number(item.durationMs,3600000) ? item.durationMs : undefined,
      publicSlug:typeof item.publicSlug === 'string' && /^[A-HJ-NP-Z2-9]{6,8}$/.test(item.publicSlug) ? item.publicSlug : undefined,
      target:item.target,wpm:item.wpm,raw:item.raw,accuracy:item.accuracy,consistency:item.consistency,errors:item.errors,
      pace:Array.isArray(item.pace) ? item.pace.filter((sample: unknown)=>number(sample,2000)).slice(0,180) : [],
      weakKeys:list(item.weakKeys,6),weakPairs:list(item.weakPairs,6),drillKeys:list(item.drillKeys,6),drillBigrams:list(item.drillBigrams,6),
      targetErrors:number(item.targetErrors,100000) ? item.targetErrors : undefined,
      challengeKey:item.challengeKey,engineVersion:item.engineVersion,sprintStyle:item.sprintStyle === 'words' ? 'words' : 'prose' });
  }
  return results.sort((left,right)=>Date.parse(right.timestamp)-Date.parse(left.timestamp));
}
export function mergePracticeHistory(current: PracticeRun[], incoming: unknown) {
  const seen = new Set<string>();
  return normalizePracticeHistory([...current,...normalizePracticeHistory(incoming)].filter(run => {
    const key = `${new Date(run.timestamp).toISOString()}|${run.challengeKey}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }));
}
export function parsePracticeBackup(contents: string) {
  if (contents.length > 50_000_000) throw new Error('Choose a Typearchy backup under 50 MB');
  let backup: { format?: string; version?: number; runs?: unknown };
  try { backup = JSON.parse(contents); } catch { throw new Error('This file is not valid JSON'); }
  if (backup && !backup.format && [1,2,3,4,5,6].includes(Number(backup.version)) && Array.isArray(backup.runs)) {
    backup = { format:'typearchy-practice', version:1, runs:backup.runs.map((run: Record<string, unknown> | null) => run && ({
      ...run, id:run.id || `desktop:${run.timestamp}:${run.mode}`,
      raw:run.rawWpm, engineVersion:run.contentVersion || '',
      durationMs:typeof run.duration === 'number' ? run.duration * 1000 : undefined,
      weakKeys:[], weakPairs:[],
    })) };
  }
  if (backup?.format !== 'typearchy-practice' || backup.version !== 1 || !Array.isArray(backup.runs)) throw new Error('Choose a Typearchy history backup from the app or browser');
  const runs = normalizePracticeHistory(backup.runs);
  if (runs.length !== backup.runs.length) throw new Error('This backup contains invalid or duplicate runs. Nothing was imported.');
  return runs;
}
export function practiceGroup(run: PracticeRun) {
  return [run.mode, run.target, run.engineVersion, ['daily','quote','drill','custom'].includes(run.mode) ? run.challengeKey : ''].join('|');
}
