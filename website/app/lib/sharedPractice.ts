import { generateCode, generateProse, generateQuoteRelay, generateShell, generateWords } from '../contentEngine.js';
import contentPack from '../contentPack.json' with { type: 'json' };
import practicePassages from '../practicePassages.json' with { type: 'json' };
type ModeKey = 'sprint' | 'words' | 'daily' | 'quote' | 'shell' | 'code' | 'focus' | 'drill' | 'custom';
type Language = 'bash' | 'python' | 'javascript' | 'rust' | 'ruby';
type SprintStyle = 'words' | 'prose';
const WORD_BANK = contentPack.words;
const DAILY_PROMPTS = contentPack.dailyPassages;
const WEB_QUOTES = contentPack.quotes;
function dailyPrompt(index: number) {
  return [0, 11, 23].map(offset => DAILY_PROMPTS[(index + offset) % DAILY_PROMPTS.length]).join(' ');
}

export type SharedChallenge = {
  mode: ModeKey;
  duration: number;
  sprintStyle: SprintStyle;
  language: Language;
  target: string;
  prompt: string;
  key: string;
  version: string;
  inputMode?: 'code' | 'shell';
};

export function sharedChallengeFromKey(key: string): SharedChallenge | null {
  if (/^drill:(?:code|shell):/.test(key)) {
    const original = sharedChallengeFromKey(key.slice(6));
    if (!original || (original.mode !== 'code' && original.mode !== 'shell')) return null;
    return { ...original, mode: 'drill', inputMode: original.mode, target: `${original.mode === 'code' ? original.language.toUpperCase() : 'SHELL'} / UNTIMED`, key };
  }
  let match = key.match(/^daily:(\d+)$/);
  if (match) return { mode: 'daily', duration: 60, sprintStyle: 'prose', language: 'javascript', target: `#${match[1]}`, prompt: dailyPrompt(Number(match[1])), key, version: 'daily-v2' };
  match = key.match(/^sprint:(words|prose):(15|30|60):(generated:(?:words|prose):[a-z0-9]+)$/);
  if (match) {
    const style = match[1] as SprintStyle; const duration = Number(match[2]);
    const generated = style === 'words' ? generateWords(WORD_BANK, Math.min(WORD_BANK.length, Math.max(160, Math.ceil(duration * 5.5))), match[3]) : generateProse(DAILY_PROMPTS, match[3], Math.max(680, duration * 18));
    return { mode: 'sprint', duration, sprintStyle: style, language: 'javascript', target: `${style.toUpperCase()} / ${duration} SEC`, prompt: generated.prompt, key, version: generated.version };
  }
  match = key.match(/^shell:(15|30|60):(generated:shell:[a-z0-9]+)$/);
  if (match) { const duration = Number(match[1]); const generated = generateShell(match[2], Math.max(360, duration * 16)); return { mode: 'shell', duration, sprintStyle: 'prose', language: 'bash', target: `${duration} SEC`, prompt: generated.prompt, key, version: generated.version }; }
  match = key.match(/^code:(bash|python|javascript|rust|ruby):(15|30|60):(generated:code:\1:[a-z0-9]+)$/);
  if (match) { const language = match[1] as Language; const duration = Number(match[2]); const generated = generateCode(language, match[3], Math.max(360, duration * 16)); return { mode: 'code', duration, sprintStyle: 'prose', language, target: `${language.toUpperCase()} / ${duration} SEC`, prompt: generated.prompt, key, version: generated.version }; }
  match = key.match(/^(generated:quote:[a-z0-9]+)$/);
  if (match) { const generated = generateQuoteRelay(WEB_QUOTES, match[1], 4); return { mode: 'quote', duration: 60, sprintStyle: 'prose', language: 'javascript', target: '4 EXCERPTS', prompt: generated.prompt, key, version: generated.version }; }
  match = key.match(/^drill:(v3:)?([^:]*):(\d+(?:-\d+){0,2})$/);
  if (match) {
    const bank = match[1] ? practicePassages.map(item => item.passage) : DAILY_PROMPTS;
    const indices = match[3].split('-').map(Number);
    if (indices.every(index => index >= 0 && index < bank.length)) return { mode:'drill',duration:60,sprintStyle:'prose',language:'javascript',target:match[2].replaceAll('-', ' / ').toUpperCase() || 'GENERAL PRACTICE',prompt:indices.map(index => bank[index]).join(' '),key,version:match[1] ? 'drill-v3' : 'drill-v2' };
  }
  return null;
}
