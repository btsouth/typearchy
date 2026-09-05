import { decodeResultTheme, type ResultTheme } from '../../lib/resultTheme';
import { runBySlug } from '../../lib/db';

export const demoRuns: Record<string, Omit<LoadedRun, 'slug' | 'demo'>> = {
  '7K2M9Q': { label: 'DAILY #241', mode: 'daily', target: '#241', duration: 74, challengeKey: 'daily:241', wpm: 94, rawWpm: 98, accuracy: 98, consistency: 92, errors: 3, pace: [58,66,74,82,88,94], handle: 'demo' },
  'F4S8RP': { label: 'SPRINT / 30 SEC', mode: 'sprint', target: 'prose / 30 seconds', duration: 30, challengeKey: 'sprint:prose:30:generated:prose:demo', wpm: 104, rawWpm: 109, accuracy: 97, consistency: 90, errors: 5, pace: [88,96,102,108,112,106,110,116,108,112,104,104], handle: 'demo' },
  'C8D3VX': { label: 'CODE / RUST', mode: 'code', target: 'rust / 30 seconds', duration: 30, challengeKey: 'code:rust:30:generated:code:rust:demo', wpm: 79, rawWpm: 81, accuracy: 99, consistency: 95, errors: 2, pace: [52,61,68,73,76,79], handle: 'demo' },
};

export type LoadedRun = {
  slug: string;
  demo: boolean;
  label: string;
  mode: string;
  target: string;
  duration: number;
  challengeKey: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  errors: number;
  pace: number[];
  handle: string;
  theme?: ResultTheme;
};

export async function loadRun(slug: string): Promise<LoadedRun | null> {
  const demo = demoRuns[slug];
  if (demo) return { ...demo, slug, demo: true };
  const row = await runBySlug(slug);
  if (!row) return null;
  let pace: number[] = [];
  try { pace = JSON.parse(row.pace_json); } catch { pace = [row.wpm]; }
  return { slug, demo: false, label: `${row.mode.toUpperCase()} / ${row.target.toUpperCase()}`, mode: row.mode, target: row.target, duration: row.duration, challengeKey: row.challenge_key, wpm: row.wpm, rawWpm: row.raw_wpm, accuracy: row.accuracy, consistency: row.consistency, errors: row.errors, pace, handle: row.handle || '', theme: decodeResultTheme(row.theme_json) };
}
