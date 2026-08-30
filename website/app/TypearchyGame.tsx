'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { generateCode, generateProse, generateQuoteRelay, generateShell, generateWords } from './contentEngine';
import contentPack from './contentPack.json';
import { advanceLineBreaks, alignCharacter, countCorrectCharacters, eraseInput, isCorrectCharacter } from './typingEngine';

type ModeKey = 'sprint' | 'words' | 'daily' | 'quote' | 'shell' | 'code' | 'focus' | 'drill' | 'custom';
type Language = 'bash' | 'python' | 'javascript' | 'rust';
type SprintStyle = 'words' | 'prose';
type Screen = 'test' | 'history';

type WebRun = {
  id: string;
  timestamp: string;
  mode: ModeKey;
  target: string;
  wpm: number;
  raw: number;
  accuracy: number;
  consistency: number;
  errors: number;
  pace: number[];
  weakKeys: string[];
  weakPairs?: string[];
  drillKeys?: string[];
  drillBigrams?: string[];
  targetErrors?: number;
  challengeKey: string;
  engineVersion: string;
  sprintStyle?: SprintStyle;
};

const MODES: { key: ModeKey; label: string }[] = [
  { key: 'sprint', label: 'SPRINT' },
  { key: 'daily', label: 'DAILY' },
  { key: 'quote', label: 'QUOTE' },
  { key: 'shell', label: 'SHELL' },
  { key: 'code', label: 'CODE' },
  { key: 'drill', label: 'DRILL' },
  { key: 'custom', label: 'CUSTOM' },
];

const THEMES = [
  { name: 'OSAKA JADE', short: 'OSAKA', bg: '#0b1511', panel: '#101d17', ink: '#d7d7ad', muted: '#6d806f', accent: '#56a47b', error: '#e95d4f' },
  { name: 'TOKYO NIGHT', short: 'TOKYO', bg: '#1a1b26', panel: '#24283b', ink: '#c0caf5', muted: '#565f89', accent: '#7aa2f7', error: '#f7768e' },
  { name: 'CATPPUCCIN', short: 'MOCHA', bg: '#1e1e2e', panel: '#313244', ink: '#cdd6f4', muted: '#6c7086', accent: '#cba6f7', error: '#f38ba8' },
  { name: 'GRUVBOX', short: 'GRUV', bg: '#282828', panel: '#3c3836', ink: '#ebdbb2', muted: '#928374', accent: '#b8bb26', error: '#fb4934' },
  { name: 'PAPER', short: 'PAPER', bg: '#f4f0e6', panel: '#e7e1d4', ink: '#282b27', muted: '#77786f', accent: '#426b8a', error: '#b4473f' },
  { name: 'AMBER CRT', short: 'AMBER', bg: '#151006', panel: '#21190a', ink: '#f2e5bd', muted: '#8f7951', accent: '#e9a520', error: '#ef5b45' },
];

const WORD_BANK = contentPack.words;
const DAILY_PROMPTS = contentPack.dailyPassages;
const WEB_QUOTES = contentPack.quotes;

const MODE_HINTS: Record<ModeKey, string> = {
  sprint: 'TIMED TEST', words: 'LEGACY WORD TEST', daily: 'SAME UTC PROMPT', quote: '4 EXCERPTS / 1 RESULT',
  shell: 'MULTILINE COMMANDS', code: 'SYNTAX COUNTS', focus: 'LEGACY FOCUS RUN', drill: 'RECENT MISTAKES / NATURAL TEXT', custom: 'YOUR LOCAL TEXT',
};

function dailyIndex() {
  const now = new Date();
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
}

function dailyPrompt(index: number) {
  return [0, 11, 23]
    .map((offset) => DAILY_PROMPTS[(index + offset) % DAILY_PROMPTS.length])
    .join(' ');
}

type SharedChallenge = {
  mode: ModeKey;
  duration: number;
  sprintStyle: SprintStyle;
  language: Language;
  target: string;
  prompt: string;
  key: string;
  version: string;
};

function sharedChallengeFromKey(key: string): SharedChallenge | null {
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
  match = key.match(/^code:(bash|python|javascript|rust):(15|30|60):(generated:code:\1:[a-z0-9]+)$/);
  if (match) { const language = match[1] as Language; const duration = Number(match[2]); const generated = generateCode(language, match[3], Math.max(360, duration * 16)); return { mode: 'code', duration, sprintStyle: 'prose', language, target: `${language.toUpperCase()} / ${duration} SEC`, prompt: generated.prompt, key, version: generated.version }; }
  match = key.match(/^(generated:quote:[a-z0-9]+)$/);
  if (match) { const generated = generateQuoteRelay(WEB_QUOTES, match[1], 4); return { mode: 'quote', duration: 60, sprintStyle: 'prose', language: 'javascript', target: '4 EXCERPTS', prompt: generated.prompt, key, version: generated.version }; }
  return null;
}

function drillChallenge(keys: string[], bigrams: string[], nonce: number) {
  const score = (text: string, pattern: string) => text.toLowerCase().split(pattern.toLowerCase()).length - 1;
  const ranked = DAILY_PROMPTS.map((prompt, index) => ({
    prompt,
    index,
    score: keys.reduce((total, key) => total + score(prompt, key), 0)
      + bigrams.reduce((total, pair) => total + score(prompt, pair.replace('→', '')) * 4, 0)
      + (((index * 17) + (nonce * 13)) % DAILY_PROMPTS.length) / 100,
  })).sort((left, right) => right.score - left.score).slice(0, 3);
  const labels = [...keys, ...bigrams.map((pair) => pair.replace('→', ''))];
  return {
    prompt: ranked.map((entry) => entry.prompt).join(' '),
    key: `drill:${labels.join('-')}:${ranked.map((entry) => entry.index).join('-')}`,
    version: 'drill-v2',
  };
}

function consistency(samples: number[]) {
  const useful = samples.filter((sample) => sample > 0);
  if (useful.length < 2) return 100;
  const average = useful.reduce((sum, sample) => sum + sample, 0) / useful.length;
  const deviation = Math.sqrt(useful.reduce((sum, sample) => sum + ((sample - average) ** 2), 0) / useful.length);
  return Math.max(0, Math.round(100 - (deviation / average) * 100));
}

function promptRuns(prompt: string, typed: string) {
  const runs: { state: string; text: string; start: number }[] = [];
  for (let index = 0; index < prompt.length; index += 1) {
    const state = index < typed.length
      ? (isCorrectCharacter(prompt[index], typed[index]) ? 'correct' : 'wrong')
      : index === typed.length ? 'current' : '';
    const previous = runs[runs.length - 1];
    if (previous && previous.state === state) previous.text += prompt[index];
    else runs.push({ state, text: prompt[index], start: index });
  }
  return runs;
}

export default function TypearchyGame({ compact = false, initialChallengeKey = '' }: { compact?: boolean; initialChallengeKey?: string }) {
  const initialShared = sharedChallengeFromKey(initialChallengeKey);
  const [sharedChallenge, setSharedChallenge] = useState<SharedChallenge | null>(initialShared);
  const [mode, setMode] = useState<ModeKey>(initialShared?.mode || 'sprint');
  const [screen, setScreen] = useState<Screen>('test');
  const [duration, setDuration] = useState(initialShared?.duration || 30);
  const [sprintStyle, setSprintStyle] = useState<SprintStyle>(initialShared?.sprintStyle || 'prose');
  const [language, setLanguage] = useState<Language>(initialShared?.language || 'javascript');
  const [themeIndex, setThemeIndex] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [customText, setCustomText] = useState('Paste or write a passage here, then apply it and start typing. Everything in Custom mode stays inside this browser.');
  const [editingCustom, setEditingCustom] = useState(false);
  const [typed, setTyped] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [pace, setPace] = useState<number[]>([]);
  const [keystrokes, setKeystrokes] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [history, setHistory] = useState<WebRun[]>([]);
  const [result, setResult] = useState<WebRun | null>(null);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef('');
  const startedRef = useRef(0);
  const completedRef = useRef(false);
  const keystrokesRef = useRef(0);
  const mistakesRef = useRef(0);
  const mistakeKeysRef = useRef<string[]>([]);
  const mistakePairsRef = useRef<string[]>([]);
  const mistakeEventsRef = useRef<{ key: string; pair: string }[]>([]);
  const paceRef = useRef<number[]>([]);
  const promptLineTopRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const storedRuns = JSON.parse(localStorage.getItem('typearchy.web.runs.v1') || '[]');
        if (Array.isArray(storedRuns)) setHistory(storedRuns.slice(0, 100));
        const storedTheme = Number(localStorage.getItem('typearchy.web.theme.v1'));
        if (storedTheme >= 0 && storedTheme < THEMES.length) setThemeIndex(storedTheme);
        if (localStorage.getItem('typearchy.web.sprint-style.v1') === 'words') setSprintStyle('words');
      } catch { /* Browser storage is optional. */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const drillProfile = useMemo(() => {
    const keyScores = new Map<string, number>();
    const pairScores = new Map<string, number>();
    history.slice(0, 12).forEach((run, index) => {
      const weight = 12 - index;
      (run.weakKeys || []).forEach((key) => {
        const normalized = key.toLowerCase();
        if (/^[a-z]$/.test(normalized)) keyScores.set(normalized, (keyScores.get(normalized) || 0) + weight);
      });
      (run.weakPairs || []).forEach((pair) => {
        const normalized = pair.toLowerCase();
        if (/^[a-z]→[a-z]$/.test(normalized)) pairScores.set(normalized, (pairScores.get(normalized) || 0) + weight);
      });
    });
    const keys = [...keyScores].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key]) => key);
    const bigrams = [...pairScores].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([pair]) => pair);
    return {
      keys: keys.length ? keys : ['r', 't'],
      bigrams: bigrams.length ? bigrams : ['t→h', 'e→r'],
      calibrating: history.length < 3,
    };
  }, [history]);

  const challenge = useMemo(() => {
    if (sharedChallenge) return { prompt: sharedChallenge.prompt, key: sharedChallenge.key, version: sharedChallenge.version };
    const seed = `${mode}-${nonce}-${duration}-${sprintStyle}-${language}`;
    if (mode === 'sprint') return sprintStyle === 'words'
      ? generateWords(WORD_BANK, Math.min(WORD_BANK.length, Math.max(160, Math.ceil(duration * 5.5))), `sprint-words-${seed}`)
      : generateProse(DAILY_PROMPTS, `sprint-prose-${seed}`, Math.max(680, duration * 18));
    if (mode === 'daily') return { prompt: dailyPrompt(dailyIndex()), key: `daily:${dailyIndex()}`, version: 'daily-v2' };
    if (mode === 'quote') return generateQuoteRelay(WEB_QUOTES, seed, 4);
    if (mode === 'shell') return generateShell(seed, Math.max(480, duration * 18));
    if (mode === 'code') return generateCode(language, seed, Math.max(480, duration * 18));
    if (mode === 'drill') return drillChallenge(drillProfile.keys, drillProfile.bigrams, nonce);
    return { prompt: customText.trim(), key: `custom:${customText.length}:${nonce}`, version: 'custom-v1' };
  }, [mode, nonce, duration, sprintStyle, language, drillProfile, customText, sharedChallenge]);
  const prompt = challenge.prompt;
  const renderedRuns = useMemo(() => promptRuns(prompt, typed), [prompt, typed]);

  const timed = mode === 'sprint' || mode === 'shell' || mode === 'code';
  const target = sharedChallenge?.target || (mode === 'sprint' ? `${sprintStyle.toUpperCase()} / ${duration} SEC` : timed ? (mode === 'code' ? `${language.toUpperCase()} / ${duration} SEC` : `${duration} SEC`) : mode === 'daily' ? `#${dailyIndex()}` : mode === 'quote' ? '4 EXCERPTS' : mode === 'drill' ? `${drillProfile.calibrating ? 'BASELINE' : 'TRAINING'} ${[...drillProfile.keys, ...drillProfile.bigrams.map((pair) => pair.replace('→', ''))].join(' / ').toUpperCase()}` : 'PASSAGE');
  const theme = THEMES[themeIndex];
  const elapsed = startedAt ? Math.max(0, Math.min(timed ? duration : Infinity, ((completedAt ?? now) - startedAt) / 1000)) : 0;
  const correct = countCorrectCharacters(prompt, typed);
  const accuracy = keystrokes ? Math.round(((keystrokes - mistakes) / keystrokes) * 100) : 100;
  const wpm = elapsed > 0.75 ? Math.round(correct / 5 / (elapsed / 60)) : 0;
  const timeValue = timed ? Math.max(0, Math.ceil(duration - elapsed)) : prompt.length ? Math.round((typed.length / prompt.length) * 100) : 0;

  const gameVars = {
    '--demo-bg': theme.bg,
    '--demo-panel': theme.panel,
    '--demo-ink': theme.ink,
    '--demo-muted': theme.muted,
    '--demo-accent': theme.accent,
    '--demo-error': theme.error,
  } as React.CSSProperties;

  const reset = useCallback((focus = true, advance = false) => {
    setTyped('');
    typedRef.current = '';
    setStartedAt(null);
    startedRef.current = 0;
    setNow(0);
    setCompletedAt(null);
    completedRef.current = false;
    setPace([]);
    paceRef.current = [];
    setKeystrokes(0);
    keystrokesRef.current = 0;
    setMistakes(0);
    mistakesRef.current = 0;
    mistakeKeysRef.current = [];
    mistakePairsRef.current = [];
    mistakeEventsRef.current = [];
    setResult(null);
    setCopied(false);
    promptLineTopRef.current = 0;
    if (promptRef.current) promptRef.current.scrollTop = 0;
    if (advance) { setSharedChallenge(null); setNonce((value) => value + 1); }
    if (focus) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const finishTest = useCallback((endedAt = Date.now()) => {
    if (!startedRef.current || completedRef.current) return;
    completedRef.current = true;
    const elapsedMs = Math.max(1000, endedAt - startedRef.current);
    const correctCharacters = countCorrectCharacters(prompt, typedRef.current);
    const finalWpm = Math.round(correctCharacters / 5 / (elapsedMs / 60000));
    const finalRaw = Math.round(keystrokesRef.current / 5 / (elapsedMs / 60000));
    const finalPace = paceRef.current.length ? [...paceRef.current, finalWpm].slice(-20) : [finalWpm];
    const run: WebRun = {
      id: `${endedAt}-${mode}`,
      timestamp: new Date(endedAt).toISOString(),
      mode,
      target,
      wpm: finalWpm,
      raw: finalRaw,
      accuracy: keystrokesRef.current ? Math.round(((keystrokesRef.current - mistakesRef.current) / keystrokesRef.current) * 100) : 100,
      consistency: consistency(finalPace),
      errors: mistakesRef.current,
      pace: finalPace,
      weakKeys: [...new Set(mistakeKeysRef.current.map((key) => key.toUpperCase()).filter((key) => key.trim()))].slice(0, 6),
      weakPairs: [...new Set(mistakePairsRef.current.map((pair) => pair.toUpperCase()))].slice(0, 6),
      drillKeys: mode === 'drill' ? drillProfile.keys : undefined,
      drillBigrams: mode === 'drill' ? drillProfile.bigrams : undefined,
      targetErrors: mode === 'drill' ? mistakeEventsRef.current.reduce((total, event) => total + (drillProfile.keys.includes(event.key) ? 1 : 0) + (drillProfile.bigrams.includes(event.pair) ? 1 : 0), 0) : undefined,
      challengeKey: challenge.key,
      engineVersion: challenge.version || 'unknown',
      sprintStyle: mode === 'sprint' ? sprintStyle : undefined,
    };
    setNow(endedAt);
    setCompletedAt(endedAt);
    setResult(run);
    setHistory((runs) => {
      const next = [run, ...runs].slice(0, 100);
      try { localStorage.setItem('typearchy.web.runs.v1', JSON.stringify(next)); } catch { /* Browser storage is optional. */ }
      return next;
    });
  }, [mode, prompt, target, challenge, sprintStyle, drillProfile]);

  useEffect(() => {
    if (!startedAt || completedAt) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      const seconds = Math.max(0.75, (current - startedRef.current) / 1000);
      const liveCorrect = countCorrectCharacters(prompt, typedRef.current);
      const sample = Math.round(liveCorrect / 5 / (seconds / 60));
      paceRef.current = [...paceRef.current, sample].slice(-19);
      setPace(paceRef.current);
      if (timed && current - startedRef.current >= duration * 1000) finishTest(startedRef.current + duration * 1000);
    }, 500);
    return () => window.clearInterval(timer);
  }, [startedAt, completedAt, prompt, timed, duration, finishTest]);

  useLayoutEffect(() => {
    const container = promptRef.current;
    const current = container?.querySelector<HTMLElement>('.current');
    if (!container || !current) return;
    const lineHeight = Number.parseFloat(window.getComputedStyle(container).lineHeight) || current.offsetHeight;
    const nextScrollTop = Math.max(0, current.offsetTop - lineHeight);
    if (Math.abs(nextScrollTop - promptLineTopRef.current) < 1) return;
    promptLineTopRef.current = nextScrollTop;
    container.scrollTo({ top: nextScrollTop, behavior: 'smooth' });
  }, [typed, prompt]);

  const chooseMode = (next: ModeKey) => {
    setSharedChallenge(null);
    setMode(next);
    setScreen('test');
    setEditingCustom(next === 'custom');
    reset(false, true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const chooseTheme = (index: number) => {
    setThemeIndex(index);
    try { localStorage.setItem('typearchy.web.theme.v1', String(index)); } catch { /* Browser storage is optional. */ }
  };

  const chooseSprintStyle = (style: SprintStyle) => {
    setSharedChallenge(null);
    setSprintStyle(style);
    try { localStorage.setItem('typearchy.web.sprint-style.v1', style); } catch { /* Browser storage is optional. */ }
    reset(false, true);
  };

  const addCharacters = (characters: string) => {
    if (result || editingCustom || !prompt) return;
    if (!startedRef.current) {
      const start = Date.now();
      startedRef.current = start;
      setStartedAt(start);
      setNow(start);
    }
    let next = typedRef.current;
    let addedMistakes = 0;
    let addedKeystrokes = 0;
    const addedKeys: string[] = [];
    const addedPairs: string[] = [];
    const addedEvents: { key: string; pair: string }[] = [];
    for (const character of characters) {
      if (next.length >= prompt.length) break;
      const index = next.length;
      const aligned = alignCharacter(prompt, next, character);
      addedKeystrokes += 1;
      if (!aligned.correct) {
        addedMistakes += 1;
        const key = aligned.expected.toLowerCase();
        const pair = index > 0 ? `${prompt[index - 1].toLowerCase()}→${key}` : '';
        addedKeys.push(key);
        if (/^[a-z]→[a-z]$/.test(pair)) addedPairs.push(pair);
        addedEvents.push({ key, pair });
      }
      next = advanceLineBreaks(mode, prompt, aligned.text, character);
    }
    if (addedKeystrokes) {
      keystrokesRef.current += addedKeystrokes;
      setKeystrokes(keystrokesRef.current);
      if (addedMistakes) {
        mistakesRef.current += addedMistakes;
        mistakeKeysRef.current = [...mistakeKeysRef.current, ...addedKeys].slice(-30);
        mistakePairsRef.current = [...mistakePairsRef.current, ...addedPairs].slice(-30);
        mistakeEventsRef.current = [...mistakeEventsRef.current, ...addedEvents].slice(-60);
        setMistakes(mistakesRef.current);
      }
    }
    typedRef.current = next;
    setTyped(next);
    if (next.length === prompt.length) window.setTimeout(() => finishTest(Date.now()), 0);
  };

  const eraseTyped = (word: boolean) => {
    if (result || editingCustom || !typedRef.current.length) return;
    const next = eraseInput(typedRef.current, word);
    typedRef.current = next;
    setTyped(next);
  };

  const handleKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r') {
      event.preventDefault();
      reset();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'h') {
      event.preventDefault();
      setScreen((value) => value === 'history' ? 'test' : 'history');
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      eraseTyped(event.ctrlKey || event.metaKey);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if ((mode === 'shell' || mode === 'code') && prompt[typedRef.current.length] === '\n') addCharacters('\n');
      return;
    }
    if (event.key === 'Tab' && prompt[typedRef.current.length] === '\t') {
      event.preventDefault();
      addCharacters('\t');
    }
  };

  const copyResult = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(`TYPEARCHY / ${result.mode.toUpperCase()} ${result.target}\n${result.wpm} WPM  |  ${result.accuracy}% ACC\nCHALLENGE ${result.challengeKey}\n${location.origin}/play`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const bestForMode = history.filter((run) => run.mode === mode && run.target === target).reduce((best, run) => Math.max(best, run.wpm), 0);
  const paceMaximum = Math.max(1, ...(result?.pace || pace));
  const technical = mode === 'shell' || mode === 'code' || mode === 'quote';

  return (
    <div id={compact ? 'typing-demo' : 'web-game'} className={`game-stage web-game ${compact ? 'web-game-compact' : 'web-game-full'} ${startedAt ? 'is-running' : ''} ${result ? 'has-result' : ''}`} style={gameVars} onClick={() => screen === 'test' && !editingCustom && inputRef.current?.focus()}>
      <div className="web-game-topline">
        <div className="web-game-view-tabs"><button type="button" className={screen === 'test' ? 'active' : ''} onClick={(event) => { event.stopPropagation(); setScreen('test'); }}>TEST</button><button type="button" className={screen === 'history' ? 'active' : ''} onClick={(event) => { event.stopPropagation(); setScreen('history'); }}>HISTORY <span>{history.length}</span></button></div>
        <div className="demo-theme-tabs" aria-label="Game theme">{THEMES.map((item, index) => <button type="button" aria-label={`Use ${item.name} theme`} aria-pressed={themeIndex === index} key={item.name} onClick={(event) => { event.stopPropagation(); chooseTheme(index); }}><i style={{ background: `linear-gradient(135deg, ${item.bg} 0 50%, ${item.accent} 50% 100%)` }} /><span>{item.short}</span></button>)}</div>
        {compact && <a className="web-game-expand" href="/play" onClick={(event) => event.stopPropagation()}>OPEN FULL GAME ↗</a>}
      </div>

      <div className="demo-mode-tabs web-game-modes" role="tablist" aria-label="Typearchy modes">{MODES.map((item) => <button type="button" role="tab" aria-selected={mode === item.key} className={mode === item.key ? 'active' : ''} key={item.key} onClick={(event) => { event.stopPropagation(); chooseMode(item.key); }}>{item.label}</button>)}</div>

      <div className="web-game-settings" onClick={(event) => event.stopPropagation()}>
        {timed && <div className="demo-duration-tabs" aria-label="Test duration">{[15, 30, 60].map((seconds) => <button type="button" aria-pressed={duration === seconds} key={seconds} onClick={() => { setSharedChallenge(null); setDuration(seconds); reset(false, true); }}>{seconds}</button>)}</div>}
        {mode === 'sprint' && <div className="web-game-language sprint-style" aria-label="Sprint content"><button type="button" className={sprintStyle === 'words' ? 'active' : ''} onClick={() => chooseSprintStyle('words')}>WORDS</button><button type="button" className={sprintStyle === 'prose' ? 'active' : ''} onClick={() => chooseSprintStyle('prose')}>PROSE</button></div>}
        {mode === 'code' && <div className="web-game-language">{(['bash', 'python', 'javascript', 'rust'] as Language[]).map((item) => <button type="button" className={language === item ? 'active' : ''} key={item} onClick={() => { setSharedChallenge(null); setLanguage(item); reset(false, true); }}>{item === 'javascript' ? 'JS' : item.toUpperCase()}</button>)}</div>}
        {mode === 'custom' && <button className="web-game-edit" type="button" onClick={() => setEditingCustom(true)}>EDIT PASSAGE</button>}
        <span>{mode === 'sprint' ? `TIMED ${sprintStyle.toUpperCase()}` : mode === 'drill' && drillProfile.calibrating ? `CALIBRATING / ${Math.min(3, history.length)} OF 3 RUNS` : MODE_HINTS[mode]}</span>
      </div>

      <div className="game-head">
        <div><strong>TYPEARCHY</strong><span>{mode.toUpperCase()}&nbsp;&nbsp;/&nbsp;&nbsp;{target}{mode === 'code' ? ` / ${language.toUpperCase()}` : ''}</span></div>
        {screen === 'test' && <div className="metrics" aria-label="Live typing statistics"><span><small>ACC</small>{accuracy}%</span><span><small>WPM</small>{wpm}</span><span><small>{timed ? 'LEFT' : 'DONE'}</small>{timeValue}{timed ? '' : '%'}</span></div>}
      </div>

      <textarea ref={inputRef} className="demo-input" onInput={(event) => { const value = (event.nativeEvent as InputEvent).data || ''; event.currentTarget.value = ''; if (value) addCharacters(value); }} onKeyDown={handleKey} onPaste={(event) => event.preventDefault()} aria-label={`Typearchy ${mode} test input`} autoCapitalize="off" autoCorrect="off" spellCheck={false} />

      {screen === 'history' ? (
        <div className="web-game-history" onClick={(event) => event.stopPropagation()}>
          <div className="web-game-history-head"><div><span>LOCAL RUN HISTORY</span><strong>{history.length} RUNS</strong></div>{history.length > 0 && <button type="button" onClick={() => { setHistory([]); localStorage.removeItem('typearchy.web.runs.v1'); }}>CLEAR</button>}</div>
          {history.length ? <div className="web-game-history-list">{history.map((run) => <button type="button" key={run.id} onClick={() => { setSharedChallenge(null); setMode(run.mode === 'words' ? 'sprint' : run.mode === 'focus' ? 'drill' : run.mode); if (run.sprintStyle) setSprintStyle(run.sprintStyle); setScreen('test'); reset(false); }}><span>{new Date(run.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}</span><strong>{run.mode.toUpperCase()} / {run.target}</strong><b>{run.wpm} WPM</b><i>{run.accuracy}%</i></button>)}</div> : <div className="web-game-empty">FINISH A TEST TO START LOCAL HISTORY.</div>}
        </div>
      ) : editingCustom ? (
        <div className="web-game-custom" onClick={(event) => event.stopPropagation()}><label htmlFor={`custom-passage-${compact ? 'compact' : 'full'}`}>CUSTOM PASSAGE</label><textarea id={`custom-passage-${compact ? 'compact' : 'full'}`} value={customText} onChange={(event) => setCustomText(event.target.value)} spellCheck={false} /><div><span>{customText.trim().length} CHARACTERS / STORED FOR THIS SESSION</span><button type="button" disabled={!customText.trim()} onClick={() => { setEditingCustom(false); reset(); }}>APPLY PASSAGE</button></div></div>
      ) : result ? (
        <div className="demo-result-card web-game-result" aria-live="polite" onClick={(event) => event.stopPropagation()}>
          <div className="demo-result-head"><strong>TYPEARCHY</strong><span>{result.mode.toUpperCase()} / {result.target}</span></div>
          <div className="demo-result-score"><div><b>{result.wpm}</b><small>WPM</small></div><span><small>{bestForMode <= result.wpm ? 'PERSONAL BEST' : 'MODE BEST'}</small><strong>{bestForMode || result.wpm} WPM</strong></span></div>
          <div className="demo-result-metrics"><span><small>ACCURACY</small>{result.accuracy}%</span><span><small>RAW</small>{result.raw} WPM</span><span><small>CONSISTENCY</small>{result.consistency}%</span><span><small>ERRORS</small>{result.errors}</span></div>
          <div className="demo-result-pace"><div><span>WPM OVER TIME</span><b>FINISH {result.wpm}</b></div><section>{result.pace.map((sample, index) => <i key={`${sample}-${index}`} style={{ height: `${Math.max(8, (sample / paceMaximum) * 100)}%` }} />)}</section></div>
          <div className="demo-result-insight"><span>{result.mode === 'drill' ? `TARGET ERRORS  ${result.targetErrors || 0}  /  ${result.target}` : result.weakKeys.length ? `DRILL NEXT  ${result.weakKeys.join('  ')}` : 'NO RECORDED WEAK KEYS'}</span><span>SAVED IN THIS BROWSER</span></div>
          <div className="demo-result-actions"><button type="button" onClick={() => reset()}>RETRY&nbsp;&nbsp;CTRL+R</button><button type="button" onClick={() => reset(true, true)}>NEW TEST</button><button type="button" onClick={copyResult}>{copied ? 'COPIED' : 'COPY RESULT'}</button></div>
        </div>
      ) : (
        <><div ref={promptRef} className={`live-prompt ${technical ? 'technical' : ''}`} aria-label={prompt}>{renderedRuns.map((run) => <span className={run.state} key={`${run.start}-${run.state}`}>{run.text}</span>)}</div><div className="demo-callout">{startedAt ? 'KEEP THE PACE' : prompt ? 'CLICK HERE, THEN START TYPING' : 'ADD A CUSTOM PASSAGE'}</div></>
      )}

      <div className="game-foot"><span>CTRL+R RESTART&nbsp;&nbsp;/&nbsp;&nbsp;CTRL+H HISTORY</span><span>{theme.name}&nbsp;&nbsp;/&nbsp;&nbsp;ENGINE {challenge.version || 'LOCAL'}</span></div>
    </div>
  );
}
