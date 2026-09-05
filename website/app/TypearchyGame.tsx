'use client';

import BrowserAccount from './account/BrowserAccount';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { generateCode, generateProse, generateQuoteRelay, generateShell, generateWords } from './contentEngine';
import PracticeHistory from './PracticeHistory';
import { sharedChallengeFromKey, type SharedChallenge } from './lib/sharedPractice';
import { learningState, learningRecord, learningProfile } from './learningEngine';
import { HISTORY_LIMIT, normalizePracticeHistory, mergePracticeHistory, practiceGroup, type PracticeRun as WebRun } from './lib/practiceHistory';
import { THEMES, selectedResultTheme } from './lib/resultTheme';
import contentPack from './contentPack.json';
import practicePassages from './practicePassages.json';
import { advanceLineBreaks, alignCharacter, countCorrectCharacters, eraseInput, isCorrectCharacter } from './typingEngine';

type ModeKey = 'sprint' | 'words' | 'daily' | 'quote' | 'shell' | 'code' | 'focus' | 'drill' | 'custom';
type Language = 'bash' | 'python' | 'javascript' | 'rust' | 'ruby';
type SprintStyle = 'words' | 'prose';
type Screen = 'test' | 'history';

const MODES: { key: ModeKey; label: string }[] = [
  { key: 'sprint', label: 'Timed typing' },
  { key: 'daily', label: 'Daily test' },
  { key: 'quote', label: 'Quotes' },
  { key: 'shell', label: 'Terminal' },
  { key: 'code', label: 'Code' },
  { key: 'drill', label: 'Mistype drills' },
  { key: 'custom', label: 'Your own text' },
];



const WORD_BANK = contentPack.words;
const DAILY_PROMPTS = contentPack.dailyPassages;
const WEB_QUOTES = contentPack.quotes;

const MODE_HINTS: Record<ModeKey, string> = {
  sprint: 'Race the clock', words: 'Word practice', daily: 'The same daily passage for everyone', quote: 'Four excerpts, one result',
  shell: 'Practice terminal commands', code: 'Punctuation and indentation count', focus: 'Focused practice', drill: 'Practice your frequent mistypes', custom: 'Your text stays on this device',
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


function drillChallenge(keys: string[], bigrams: string[], nonce: number) {
  const score = (text: string, pattern: string) => text.toLowerCase().split(pattern.toLowerCase()).length - 1;
  const ranked = practicePassages.map(item => item.passage).map((prompt, index) => ({
    prompt,
    index,
    score: keys.reduce((total, key) => total + score(prompt, key), 0)
      + bigrams.reduce((total, pair) => total + score(prompt, pair.replace('→', '')) * 4, 0)
      + (((index * 17) + (nonce * 13)) % DAILY_PROMPTS.length) / 100,
  })).sort((left, right) => right.score - left.score).slice(0, 3);
  const labels = [...keys, ...bigrams.map((pair) => pair.replace('→', ''))];
  return {
    prompt: ranked.map((entry) => entry.prompt).join(' '),
    key: `drill:v3:${labels.join('-')}:${ranked.map((entry) => entry.index).join('-')}`,
    version: 'drill-v3',
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
  const [customIdentity, setCustomIdentity] = useState({ text: '', key: '' });
  useEffect(() => {
    let active = true; const text = customText.trim();
    void crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(buffer => {
      const key = 'custom:sha256:' + Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2,'0')).join('');
      if (active) setCustomIdentity({ text, key });
    });
    return () => { active = false; };
  }, [customText]);
  const [typed, setTyped] = useState('');
  const [paused, setPaused] = useState(false);
  const pausedAt = useRef<number | null>(null);
  const interrupted = useRef(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [pace, setPace] = useState<number[]>([]);
  const [keystrokes, setKeystrokes] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const shareGeneration = useRef(0);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);
  const [history, setHistory] = useState<WebRun[]>([]);
  const [storageError, setStorageError] = useState(false);
  const [result, setResult] = useState<WebRun | null>(null);
  const [practiceSession, setPracticeSession] = useState<{ baseline: WebRun; challenge: SharedChallenge; stage: 'drill' | 'retest' } | null>(null);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
  const promptRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef('');
  const learningRef = useRef(learningState());
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
        setHistory(normalizePracticeHistory(storedRuns));
        const storedTheme = Number(localStorage.getItem('typearchy.web.theme.v1'));
        if (storedTheme >= 0 && storedTheme < THEMES.length) setThemeIndex(storedTheme);
        if (localStorage.getItem('typearchy.web.sprint-style.v1') === 'words') setSprintStyle('words');
      } catch { setStorageError(true); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const practiceEvidence = useMemo(() => learningProfile(history), [history]);
  const drillProfile = useMemo(() => {
    const keys = practiceEvidence.keys.filter(row => /^[a-z]$/.test(row.key)).slice(0, 2).map(row => row.key);
    const bigrams = practiceEvidence.pairs.filter(row => /^[a-z]→[a-z]$/.test(row.key)).slice(0, 2).map(row => row.key);
    return { keys, bigrams,
      calibrating: practiceEvidence.calibrating, personalized: keys.length > 0 || bigrams.length > 0 };
  }, [practiceEvidence]);

  const challenge = useMemo(() => {
    if (sharedChallenge) return { prompt: sharedChallenge.prompt, key: sharedChallenge.key, version: sharedChallenge.version };
    const seed = `${mode}-${nonce}-${duration}-${sprintStyle}-${language}`;
    if (mode === 'sprint') return sprintStyle === 'words'
      ? generateWords(WORD_BANK, Math.min(WORD_BANK.length, Math.max(160, Math.ceil(duration * 5.5))), `sprint-words-${seed}`)
      : generateProse(DAILY_PROMPTS, `sprint-prose-${seed}`, Math.max(680, duration * 18));
    if (mode === 'daily') return { prompt: dailyPrompt(dailyIndex()), key: `daily:${dailyIndex()}`, version: 'daily-v2' };
    if (mode === 'quote') return generateQuoteRelay(WEB_QUOTES, seed, 4);
    if (mode === 'shell') return generateShell(seed, Math.max(360, duration * 16));
    if (mode === 'code') return generateCode(language, seed, Math.max(360, duration * 16));
    if (mode === 'drill') return drillChallenge(drillProfile.keys, drillProfile.bigrams, nonce);
    return { prompt: customText.trim(), key: customIdentity.text === customText.trim() ? customIdentity.key : '', version: 'custom-v2' };
  }, [mode, nonce, duration, sprintStyle, language, drillProfile, customText, customIdentity, sharedChallenge]);
  const prompt = challenge.prompt;
  const inputMode = sharedChallenge?.inputMode || mode;
  const renderedRuns = useMemo(() => promptRuns(prompt, typed), [prompt, typed]);

  const timed = mode === 'sprint' || mode === 'shell' || mode === 'code';
  const target = sharedChallenge?.target || (mode === 'sprint' ? `${sprintStyle.toUpperCase()} / ${duration} SEC` : timed ? (mode === 'code' ? `${language.toUpperCase()} / ${duration} SEC` : `${duration} SEC`) : mode === 'daily' ? `#${dailyIndex()}` : mode === 'quote' ? '4 EXCERPTS' : mode === 'drill' ? `${!drillProfile.personalized ? 'GENERAL PRACTICE' : drillProfile.calibrating ? 'EARLY PRACTICE' : 'TRAINING'} ${[...drillProfile.keys, ...drillProfile.bigrams.map((pair) => pair.replace('→', ''))].join(' / ').toUpperCase()}` : 'PASSAGE');
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
    setPaused(false); pausedAt.current = null; interrupted.current = false;
    typedRef.current = '';
    learningRef.current = learningState();
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
    shareGeneration.current += 1;
    setShareBusy(false);
    setShareError('');
    setNeedsProfile(false);
    setCopied(false);
    promptLineTopRef.current = 0;
    if (promptRef.current) promptRef.current.scrollTop = 0;
    if (advance) { setSharedChallenge(null); setPracticeSession(null); setNonce((value) => value + 1); }
    if (focus) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const finishTest = useCallback((endedAt = performance.now()) => {
    if (!startedRef.current || completedRef.current || pausedAt.current !== null) return;
    completedRef.current = true;
    const elapsedMs = Math.max(1000, endedAt - startedRef.current);
    const correctCharacters = countCorrectCharacters(prompt, typedRef.current);
    const finalWpm = Math.round(correctCharacters / 5 / (elapsedMs / 60000));
    const finalRaw = Math.round(keystrokesRef.current / 5 / (elapsedMs / 60000));
    const finalPace = paceRef.current.length ? [...paceRef.current, finalWpm].slice(-20) : [finalWpm];
    const run: WebRun = {
      id: crypto.randomUUID(),
      interrupted: interrupted.current,
      timestamp: new Date().toISOString(),
      mode,
      target,
      durationMs: elapsedMs,
      learning: learningRef.current,
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
      const next = [run, ...runs].slice(0, HISTORY_LIMIT);
      try { localStorage.setItem('typearchy.web.runs.v1', JSON.stringify(next)); } catch { setStorageError(true); }
      return next;
    });
  }, [mode, prompt, target, challenge, sprintStyle, drillProfile]);

  useEffect(() => {
    if (!startedAt || completedAt || paused) return;
    const timer = window.setInterval(() => {
      if (pausedAt.current !== null || completedRef.current) return;
      const current = performance.now();
      setNow(current);
      const seconds = Math.max(0.75, (current - startedRef.current) / 1000);
      const liveCorrect = countCorrectCharacters(prompt, typedRef.current);
      const sample = Math.round(liveCorrect / 5 / (seconds / 60));
      paceRef.current = [...paceRef.current, sample].slice(-19);
      setPace(paceRef.current);
      if (timed && current - startedRef.current >= duration * 1000) finishTest(startedRef.current + duration * 1000);
    }, 500);
    return () => window.clearInterval(timer);
  }, [startedAt, completedAt, paused, prompt, timed, duration, finishTest]);

  const pausePractice = useCallback(() => {
    if (!startedRef.current || completedRef.current || pausedAt.current !== null) return;
    const current = performance.now();
    if (timed && current - startedRef.current >= duration * 1000) {
      finishTest(startedRef.current + duration * 1000); return;
    }
    pausedAt.current = current; interrupted.current = true;
    setNow(current); setPaused(true);
  }, [timed, duration, finishTest]);
  const resumePractice = () => {
    if (pausedAt.current === null) return;
    startedRef.current += performance.now() - pausedAt.current;
    pausedAt.current = null; setStartedAt(startedRef.current);
    setNow(performance.now()); setPaused(false); inputRef.current?.focus();
  };
  useEffect(() => {
    const hidden = () => { if (document.hidden) pausePractice(); };
    window.addEventListener('blur', pausePractice);
    document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', pausePractice); document.removeEventListener('visibilitychange', hidden); };
  }, [pausePractice]);

  useLayoutEffect(() => {
    const container = promptRef.current;
    const current = container?.querySelector<HTMLElement>('.current');
    if (!container || !current) return;
    const lineHeight = Number.parseFloat(window.getComputedStyle(container).lineHeight) || current.offsetHeight;
    const nextScrollTop = Math.max(0, current.offsetTop - lineHeight);
    if (Math.abs(nextScrollTop - promptLineTopRef.current) < 1) return;
    promptLineTopRef.current = nextScrollTop;
    container.scrollTo({ top: nextScrollTop, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [typed, prompt]);

  const chooseMode = (next: ModeKey, focus = true) => {
    setPracticeSession(null);
    setSharedChallenge(null);
    setMode(next);
    setScreen('test');
    setEditingCustom(next === 'custom');
    reset(false, true);
    if (focus) window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  function startFocusedPractice() {
    if (!result || !sharedChallengeFromKey(result.challengeKey)) return;
    const baseline = result;
    const original: SharedChallenge = { mode, duration, sprintStyle, language, target, prompt, key: challenge.key, version: challenge.version || 'unknown' };
    chooseMode('drill');
    if (mode === 'code' || mode === 'shell') setSharedChallenge({ ...original, mode: 'drill', inputMode: mode, target: `${mode === 'code' ? language.toUpperCase() : 'SHELL'} / UNTIMED`, key: `drill:${original.key}` });
    setPracticeSession({ baseline, challenge: original, stage: 'drill' });
  }
  function retestBaseline() {
    if (!practiceSession) return;
    const original = practiceSession.challenge;
    setSharedChallenge(original); setMode(original.mode); setDuration(original.duration);
    setSprintStyle(original.sprintStyle); setLanguage(original.language); setScreen('test');
    setPracticeSession({ ...practiceSession, stage: 'retest' }); reset();
  }

  const chooseTheme = (index: number) => {
    setThemeIndex(index);
    try { localStorage.setItem('typearchy.web.theme.v1', String(index)); } catch { setStorageError(true); }
  };

  const chooseSprintStyle = (style: SprintStyle) => {
    setSharedChallenge(null);
    setSprintStyle(style);
    try { localStorage.setItem('typearchy.web.sprint-style.v1', style); } catch { setStorageError(true); }
    reset(false, true);
  };

  const addCharacters = (characters: string) => {
    if (pausedAt.current !== null || screen !== 'test' || result || completedRef.current || editingCustom || !prompt) return;
    if (timed && startedRef.current && performance.now() - startedRef.current >= duration * 1000) { finishTest(startedRef.current + duration * 1000); return; }
    if (!startedRef.current) {
      const start = performance.now();
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
      learningRecord(learningRef.current, aligned.expected, index > 0 ? prompt[index - 1] : '', aligned.correct);
      addedKeystrokes += 1;
      if (!aligned.correct) {
        addedMistakes += 1;
        const key = aligned.expected.toLowerCase();
        const pair = index > 0 ? `${prompt[index - 1].toLowerCase()}→${key}` : '';
        addedKeys.push(key);
        if (/^[a-z]→[a-z]$/.test(pair)) addedPairs.push(pair);
        addedEvents.push({ key, pair });
      }
      next = advanceLineBreaks(inputMode, prompt, aligned.text, character);
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
    if (next.length === prompt.length) window.setTimeout(() => finishTest(performance.now()), 0);
  };

  const eraseTyped = (word: boolean) => {
    if (pausedAt.current !== null || screen !== 'test' || result || completedRef.current || editingCustom || !typedRef.current.length) return;
    if (timed && startedRef.current && performance.now() - startedRef.current >= duration * 1000) { finishTest(startedRef.current + duration * 1000); return; }
    const next = eraseInput(typedRef.current, word);
    typedRef.current = next;
    setTyped(next);
  };

  const handleKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || composingRef.current) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r') {
      event.preventDefault();
      if (!result || sharedChallengeFromKey(result.challengeKey) || (result.mode === 'custom' && result.challengeKey === customIdentity.key)) reset();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'h') {
      event.preventDefault();
      pausePractice(); setScreen((value) => value === 'history' ? 'test' : 'history');
      return;
    }
    if (event.key === 'Escape') { event.preventDefault(); pausePractice(); return; }
    if (pausedAt.current !== null || screen !== 'test') return;
    if (event.key === 'Backspace') {
      event.preventDefault();
      eraseTyped(event.ctrlKey || event.metaKey);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if ((inputMode === 'shell' || inputMode === 'code') && prompt[typedRef.current.length] === '\n') addCharacters('\n');
      return;
    }
    if (event.key === 'Tab' && prompt[typedRef.current.length] === '\t') {
      event.preventDefault();
      addCharacters('\t');
    }
  };

  const copyResult = async () => {
    if (!result || shareBusy || result.interrupted || result.completed === false) return;
    const generation = shareGeneration.current;
    const isCurrent = () => generation === shareGeneration.current;
    setShareBusy(true); setShareError(''); setNeedsProfile(false);
    try {
      let slug = result.publicSlug;
      if (!slug) {
        const response = await fetch('/api/runs', { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
          clientRunId:`browser:${result.id}`,timestamp:result.timestamp,contentVersion:result.engineVersion,mode:result.mode,
          challengeKey:result.challengeKey,target:result.target,duration:Math.max(1,Math.round((result.durationMs || 30000)/1000)),
          wpm:result.wpm,rawWpm:result.raw,accuracy:result.accuracy,consistency:result.consistency,errors:result.errors,pace:result.pace,
          theme:selectedResultTheme(),
        }) });
        const data=await response.json() as {slug:string;error?:string};
        if(response.status===401 && isCurrent()) setNeedsProfile(true);
        if(!response.ok) throw new Error(data.error || 'Could not share this result');
        slug=data.slug; const updated={...result,publicSlug:slug};
        if (isCurrent()) setResult(current => current?.id === result.id ? updated : current);
        setHistory(runs=>{const next=runs.map(run=>run.id===result.id ? updated : run);try{localStorage.setItem('typearchy.web.runs.v1',JSON.stringify(next));}catch{}return next;});
      }
      if (!isCurrent()) return;
      try { await navigator.clipboard.writeText(`https://typearchy.com/r/${slug}`); if (isCurrent()) setCopied(true); }
      catch { if (isCurrent()) setShareError('Your result is published. Open it below to share the URL.'); }
    } catch(cause) {if (isCurrent()) setShareError(cause instanceof TypeError ? 'Could not reach Typearchy. Your result is saved. Check your connection and try again.' : cause instanceof Error ? cause.message : 'Could not share this result');}
    finally {if (isCurrent()) setShareBusy(false);}
  };

  const bestForMode = history.filter((run) => !run.interrupted && run.completed !== false && (result ? practiceGroup(run) === practiceGroup(result) : run.mode === mode && run.target === target && run.engineVersion === challenge.version)).reduce((best, run) => Math.max(best, run.wpm), 0);
  const paceMaximum = Math.max(1, ...(result?.pace || pace));
  const technical = inputMode === 'shell' || inputMode === 'code' || mode === 'quote';

  return (
    <div id={compact ? 'typing-demo' : 'web-game'} className={`game-stage web-game ${compact ? 'web-game-compact' : 'web-game-full'} ${startedAt ? 'is-running' : ''} ${result ? 'has-result' : ''}`} style={gameVars} onClick={() => screen === 'test' && !editingCustom && inputRef.current?.focus()}>
      <div className="web-game-topline">
        <div className="web-game-view-tabs"><button type="button" className={screen === 'test' ? 'active' : ''} onClick={(event) => { event.stopPropagation(); setScreen('test'); if(result) reset(true, true); }}>Practice</button><button type="button" className={screen === 'history' ? 'active' : ''} onClick={(event) => { event.stopPropagation(); pausePractice(); setScreen('history'); }}>History <span>{history.length}</span></button></div>
        <label className="game-theme-picker" onClick={event => event.stopPropagation()}>Theme<select aria-label="Game theme" value={themeIndex} onChange={event => chooseTheme(Number(event.target.value))}>{THEMES.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}</select></label>
        {compact && <a className="web-game-expand" href="/play" onClick={(event) => event.stopPropagation()}>OPEN FULL GAME ↗</a>}
      </div>

      {screen === 'test' && !result && <><div inert={!!startedAt} className="web-game-modes" onClick={event => event.stopPropagation()}><label className="game-mode-picker">Practice<select aria-label="Practice mode" value={mode} onChange={event => chooseMode(event.target.value as ModeKey, false)}>{MODES.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label></div>

      <div inert={!!startedAt} className="web-game-settings" onClick={(event) => event.stopPropagation()}>
        {timed && <div className="demo-duration-tabs" aria-label="Test duration">{[15, 30, 60].map((seconds) => <button type="button" aria-pressed={duration === seconds} key={seconds} onClick={() => { setSharedChallenge(null); setDuration(seconds); reset(false, true); }}>{seconds}s</button>)}</div>}
        {mode === 'sprint' && <div className="web-game-language sprint-style" aria-label="Sprint content"><button type="button" className={sprintStyle === 'words' ? 'active' : ''} onClick={() => chooseSprintStyle('words')}>Words</button><button type="button" className={sprintStyle === 'prose' ? 'active' : ''} onClick={() => chooseSprintStyle('prose')}>Passages</button></div>}
        {mode === 'code' && <div className="web-game-language">{(['bash', 'python', 'javascript', 'rust', 'ruby'] as Language[]).map((item) => <button type="button" className={language === item ? 'active' : ''} key={item} onClick={() => { setSharedChallenge(null); setLanguage(item); reset(false, true); }}>{item === 'javascript' ? 'JS' : item.toUpperCase()}</button>)}</div>}
        {mode === 'custom' && <button className="web-game-edit" type="button" onClick={() => setEditingCustom(true)}>EDIT PASSAGE</button>}
        <span>{mode === 'sprint' ? 'Choose a duration and start typing' : mode === 'drill' && sharedChallenge?.inputMode ? 'The same code, without a timer' : mode === 'drill' && drillProfile.calibrating ? 'Type a few runs to personalize your drills' : MODE_HINTS[mode]}</span>
      </div>

      </>}
      {screen === 'test' && !result && <div className="game-head">
        <div className="game-instruction">{startedAt ? 'One keystroke at a time.' : 'Ready when you are.'}</div>
        {screen === 'test' && <div className="metrics" aria-label="Live typing statistics"><span><small>Accuracy</small>{accuracy}%</span><span><small>WPM</small>{wpm}</span><span><small>{timed ? 'Seconds left' : 'Complete'}</small>{timeValue}{timed ? '' : '%'}</span></div>}
      </div>}

      {practiceSession && !result && <div className="practice-session-bar"><span>{practiceSession.stage === 'drill' ? '2 / 3 · Focused practice' : '3 / 3 · Retest your original passage'}</span><span>Baseline: {practiceSession.baseline.wpm} WPM · {practiceSession.baseline.accuracy}% accuracy</span></div>}
      <textarea ref={inputRef} className="demo-input" onCompositionStart={() => { composingRef.current = true; }} onCompositionEnd={event => { composingRef.current = false; event.currentTarget.value = ''; if (event.data) addCharacters(event.data.normalize('NFC')); }} onInput={(event) => { if (composingRef.current || (event.nativeEvent as InputEvent).isComposing) return; const value = event.currentTarget.value; event.currentTarget.value = ''; if (value) addCharacters(value.normalize('NFC')); }} onKeyDown={handleKey} onPaste={(event) => event.preventDefault()} aria-label={`Typearchy ${mode} test input`} autoCapitalize="off" autoCorrect="off" spellCheck={false} />

      {storageError && <p role="alert">Browser storage is unavailable. Runs are kept in this tab only. Export your history before closing it.</p>}
      {screen === 'history' ? (
        <PracticeHistory history={history} canRetest={run => !!sharedChallengeFromKey(run.challengeKey) || (run.mode === 'custom' && run.challengeKey === customIdentity.key)} onImport={incoming => {
          const merged = mergePracticeHistory(history, incoming);
          localStorage.setItem('typearchy.web.runs.v1', JSON.stringify(merged)); setHistory(merged);
        }} onClear={() => { setHistory([]); try { localStorage.removeItem('typearchy.web.runs.v1'); } catch {} }} onRetest={run => {
          const previous = sharedChallengeFromKey(run.challengeKey);
          setSharedChallenge(previous); setMode(run.mode === 'words' ? 'sprint' : run.mode === 'focus' ? 'drill' : run.mode);
          if (previous) { setDuration(previous.duration); setLanguage(previous.language); }
          if (run.sprintStyle) setSprintStyle(run.sprintStyle); setEditingCustom(false); setPracticeSession(null); setScreen('test'); reset(false); setResult(run); completedRef.current = true;
        }} />
      ) : editingCustom ? (
        <div className="web-game-custom" onClick={(event) => event.stopPropagation()}><label htmlFor={`custom-passage-${compact ? 'compact' : 'full'}`}>CUSTOM PASSAGE</label><textarea id={`custom-passage-${compact ? 'compact' : 'full'}`} value={customText} onChange={(event) => setCustomText(event.target.value)} spellCheck={false} /><div><span>{customText.trim().length} CHARACTERS / STORED FOR THIS SESSION</span><button type="button" disabled={!customText.trim() || customIdentity.text !== customText.trim()} onClick={() => { setEditingCustom(false); reset(); }}>APPLY PASSAGE</button></div></div>
      ) : result ? (
        <div className="demo-result-card web-game-result" aria-live="polite" onClick={(event) => event.stopPropagation()}>
          <div className="demo-result-head"><strong>TYPEARCHY</strong><span>{result.mode.toUpperCase()} / {result.target}</span></div>
          <div className="demo-result-score"><div><b>{result.wpm}</b><small>WPM</small></div><span><small>{result.interrupted ? 'PAUSED PRACTICE' : result.completed === false ? 'INCOMPLETE' : bestForMode <= result.wpm ? 'PERSONAL BEST' : 'COMPARABLE BEST'}</small><strong>{result.interrupted || result.completed === false ? 'Not compared' : `${bestForMode || result.wpm} WPM`}</strong></span></div>
          <div className="demo-result-metrics"><span><small>ACCURACY</small>{result.accuracy}%</span><span><small>RAW</small>{result.raw} WPM</span><span><small>CONSISTENCY</small>{result.consistency}%</span><span><small>ERRORS</small>{result.errors}</span></div>
          <div className="demo-result-pace"><div><span>WPM OVER TIME</span><b>FINISH {result.wpm}</b></div><section>{result.pace.map((sample, index) => <i key={`${sample}-${index}`} style={{ height: `${Math.max(8, (sample / paceMaximum) * 100)}%` }} />)}</section></div>
          <div className="demo-result-actions"><button type="button" disabled={!sharedChallengeFromKey(result.challengeKey) && !(result.mode === 'custom' && result.challengeKey === customIdentity.key)} onClick={() => reset()}>RETRY&nbsp;&nbsp;CTRL+R</button><button type="button" onClick={() => reset(true, true)}>NEW TEST</button>{result.mode !== 'custom' && !result.interrupted && result.completed !== false && <button type="button" disabled={shareBusy || needsProfile} onClick={copyResult}>{shareBusy ? 'SHARING…' : copied ? 'LINK COPIED' : result.publicSlug ? 'COPY LINK' : 'SHARE RESULT'}</button>}{result.publicSlug && <a href={`/r/${result.publicSlug}`}>VIEW RESULT ↗</a>}</div>
          <details className="practice-feedback" open={practiceSession ? true : undefined}><summary>Practice tips &amp; mistype drills</summary>
            <h3>{result.accuracy < 95 ? 'Give accuracy your attention.' : practiceEvidence.keys.length ? 'A useful next practice.' : 'Keep your rhythm.'}</h3>
            <p>{result.accuracy < 95 ? 'Ease the pace and aim for clean keystrokes. Speed is easier to build on a steady, accurate run.' : practiceEvidence.keys.length ? 'Repeated trouble spots from recent practice, accounting for how often each key appeared.' : 'There is no clear repeated trouble spot yet. Try another passage or a longer test.'}</p>
            {practiceEvidence.keys.length > 0 && <ul>{practiceEvidence.keys.slice(0,3).map(row => <li key={row.key}><kbd>{row.key === 'space' ? 'Space' : row.key === 'enter' ? 'Enter' : row.key}</kbd><span>{row.errors} misses in {row.attempts} attempts</span></li>)}</ul>}
            <p className="practice-evidence-note">{practiceEvidence.sampledRuns} measured {practiceEvidence.sampledRuns === 1 ? 'run' : 'runs'} · Corrections count as new attempts. {practiceEvidence.calibrating ? 'Suggestions will become more useful as you practice.' : 'Recent practice only.'}</p>
            {practiceSession?.stage === 'drill' ? <button type="button" onClick={retestBaseline}>Retest the original passage</button>
              : practiceSession?.stage === 'retest' ? <div className="practice-retest"><h3>Your retest</h3><p>Same passage and rules as your baseline.</p><dl><div><dt>Speed</dt><dd>{practiceSession.baseline.wpm} → {result.wpm} WPM</dd></div><div><dt>Accuracy</dt><dd>{practiceSession.baseline.accuracy}% → {result.accuracy}%</dd></div></dl><p>This is one comparison. Repeat across several sessions to see a lasting trend.</p><button type="button" onClick={() => { setPracticeSession(null); reset(true,true); }}>Finish session · New passage</button></div>
                : (drillProfile.personalized || ((mode === 'code' || mode === 'shell') && result.errors > 0)) && result.mode !== 'drill' && <button type="button" onClick={startFocusedPractice}>{mode === 'code' || mode === 'shell' ? 'Practice this code, then retest' : 'Practice letter patterns, then retest'}</button>}
          </details>
          <p role="status">{result.interrupted ? 'Paused practice. Saved locally and excluded from personal bests and sharing.' : result.publicSlug ? 'Shared. Anyone with the link can view this result.' : storageError ? 'Kept in this tab. Export history before closing.' : 'Saved on this device. Share only when you want to.'}</p>
          {shareError && !needsProfile && <p role="alert">{shareError}</p>}{needsProfile && <section aria-label="Connect to share"><p>Your result is saved. Connect once, then share it.</p><BrowserAccount onReady={() => { setNeedsProfile(false); setShareError(''); }} /></section>}
          {result.mode === 'custom' && <p>Custom practice stays local. <a href="/challenges/new">Create a challenge</a> to share a passage for others to race.</p>}

        </div>
      ) : paused ? (
        <div className="demo-result-card" onClick={event => event.stopPropagation()}><h2>Practice paused</h2><p>Your place is saved. Resumed runs stay in history but do not count toward personal bests or sharing.</p><div className="demo-result-actions"><button type="button" onClick={resumePractice}>Resume practice</button><button type="button" onClick={() => reset()}>Start again</button></div></div>
      ) : (
        <><div ref={promptRef} className={`live-prompt ${technical ? 'technical' : ''}`} aria-label={prompt}>{renderedRuns.map((run) => <span className={run.state} key={`${run.start}-${run.state}`}>{run.text}</span>)}</div><div className="demo-callout">{startedAt ? 'KEEP THE PACE' : prompt ? 'CLICK HERE, THEN START TYPING' : 'ADD A CUSTOM PASSAGE'}</div></>
      )}

      <div className="game-foot" onClick={event => event.stopPropagation()}>{screen === 'test' && !result && !editingCustom && <button type="button" className="practice-restart" onClick={() => reset()} aria-label="Restart practice">Restart <kbd>Ctrl+R</kbd></button>}<span>Ctrl+H history</span><span>Saved on this device</span></div>
    </div>
  );
}
