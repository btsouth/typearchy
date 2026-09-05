'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { competitionState, competitionStep, competitionResult, competitionPosition, MAX_DURATION_MS } from '../../competitionEngine';
import { selectedResultTheme } from '../../lib/resultTheme';
import type { PublicChallenge } from '../../lib/challenges';
import { tabStorage, readAttemptDraft, writeAttemptDraft, type AttemptDraft } from '../../lib/attemptDraft';
import type { AttemptEvent } from '../../lib/challengeContract';
import { firstMistake, raceProgress, tabIndent } from '../../lib/raceInput';

type Ghost = { slug: string; handle: string; durationMs: number; progress: number[][] };
type Session = { id: string; token: string; expiresAt: number; contentHash: string };
type Score = ReturnType<typeof competitionResult>;
type View = { typed: string[]; correct: number; errors: number; wrong: number };

export default function ChallengeRace({ challenge, ghost }: { challenge: PublicChallenge; ghost: Ghost | null }) {
  const engine = useRef(competitionState(challenge.passage, challenge.rules));
  const input = useRef<HTMLTextAreaElement>(null); const prompt = useRef<HTMLDivElement>(null);
  const recording = useRef<AttemptEvent[]>([]); const origin = useRef<number | null>(null);
  const draft = useRef<AttemptDraft | null>(null);
  const composing = useRef(false); const finishing = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<'ready' | 'preparing' | 'armed' | 'running' | 'finished' | 'stopped'>('ready');
  const [view, setView] = useState<View>({ typed: [], correct: 0, errors: 0, wrong: 0 });
  const [elapsed, setElapsed] = useState(0); const [score, setScore] = useState<Score | null>(null);
  const [saved, setSaved] = useState(false); const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState<string | null>(null); const [error, setError] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false); const [copied, setCopied] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inputHint, setInputHint] = useState('');
  const chars = useMemo(() => Array.from(challenge.passage), [challenge.passage]);

  function persistDraft(value: AttemptDraft) {
    draft.current = value;
    if (!writeAttemptDraft(tabStorage(), challenge.slug, value))
      setError('Browser storage is unavailable. Keep this tab open until your result is saved.');
  }
  useEffect(() => {
    const previous = readAttemptDraft(tabStorage(), challenge.slug, challenge.contentHash);
    if (!previous) return;
    // Hydrate a tab-local result after server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(previous.session);
    setScore(previous.score); setElapsed(previous.score.durationMs); setSaved(previous.saved);
    setPublished(previous.published); setPhase('finished'); draft.current = previous;
    recording.current = previous.events; finishing.current = true;
    setView({ typed: Array.from(challenge.passage), correct: previous.score.characters, errors: previous.score.errors, wrong: 0 });
  }, [challenge.slug, challenge.contentHash, challenge.passage]);

  const save = useCallback(async (active: Session, events: AttemptEvent[]) => {
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/attempts/${active.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Attempt-Token': active.token }, body: JSON.stringify({ events, theme: selectedResultTheme() }) });
      const data = await response.json() as Session & { error?: string; url: string }; if (!response.ok) throw new Error(data.error || 'Could not save your result');
      setSaved(true);
      if (draft.current?.session.id === active.id) {
        draft.current = { ...draft.current, saved: true, events: [] };
        writeAttemptDraft(tabStorage(), challenge.slug, draft.current);
      }
    } catch (cause) { setError(cause instanceof TypeError ? 'Connection interrupted. Your result is safe in this tab. Retry saving when you are online.' : cause instanceof Error ? cause.message : 'Could not save your result. Try again.'); }
    finally { setSaving(false); }
  }, [challenge.slug]);

  async function prepare() {
    if (phase === 'preparing' || saving) return;
    if (score && !saved && !window.confirm('This result has not been saved. Discard it and start another race?')) return;
    setInputHint('');
    setPhase('preparing'); setError('');
    try {
      const response = await fetch(`/api/challenges/${challenge.slug}/attempts`, { method: 'POST' });
      const data = await response.json() as Session & { error?: string; url: string }; if (!response.ok) throw new Error(data.error || 'Could not start your attempt');
      if (data.contentHash !== challenge.contentHash) throw new Error('This challenge changed. Reload before racing.');
      engine.current = competitionState(challenge.passage, challenge.rules); recording.current = []; origin.current = null; finishing.current = false;
      setView({ typed: [], correct: 0, errors: 0, wrong: 0 }); setElapsed(0); setScore(null); setSaved(false); setPublished(null); setNeedsProfile(false); setCopied(false);
      draft.current = null; tabStorage()?.removeItem(`typearchy.attempt.${challenge.slug}`);
      setSession(data); setPhase('armed');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start'); setPhase(score ? 'finished' : 'ready'); }
  }

  useEffect(() => {
    if (phase !== 'armed') return;
    input.current?.focus({ preventScroll: true });
    prompt.current?.closest('.competition-race')?.querySelector('.competition-scoreboard')?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [phase]);
  useEffect(() => {
    if (phase !== 'running') return;
    const timer = window.setInterval(() => {
      if (origin.current === null || finishing.current) return;
      const time = Math.round(performance.now() - origin.current);
      setElapsed(Math.min(time, MAX_DURATION_MS));
      if (time > MAX_DURATION_MS) { finishing.current = true; setPhase('stopped'); setError('This attempt reached the 15 minute limit. Start a fresh race when you are ready.'); }
    }, 50);
    return () => window.clearInterval(timer);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'running' && !(score && !saved)) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [phase, score, saved]);
  useLayoutEffect(() => {
    const current = prompt.current?.querySelector<HTMLElement>('[data-caret]');
    if (prompt.current && current) prompt.current.scrollTop = Math.max(0, current.offsetTop - prompt.current.offsetTop - 65);
  }, [view.typed.length]);

  function apply(type: AttemptEvent['type'], text?: string) {
    if (!session || !['armed', 'running'].includes(phase) || finishing.current) return;
    if (origin.current === null && type !== 'input') return;
    const now = performance.now(); if (origin.current === null) origin.current = now;
    const at = Math.round(now - origin.current);
    const event = (type === 'input' ? { type, text: text!, at } : { type, at }) as AttemptEvent;
    try {
      competitionStep(engine.current, event); recording.current.push(event);
      setView({ typed: [...engine.current.typed], correct: engine.current.correct, errors: engine.current.errors, wrong: engine.current.wrong });
      setElapsed(at);
      if (engine.current.finishedAt !== null) {
        finishing.current = true; const result = competitionResult(engine.current);
        setScore(result); setPhase('finished');
        persistDraft({ session, score: result, events: [...recording.current], saved: false, published: null, updatedAt: Date.now() });
        void save(session, [...recording.current]);
      } else setPhase('running');
    } catch (cause) { finishing.current = true; setPhase('stopped'); setError(cause instanceof Error ? cause.message : 'Could not process input'); }
  }

  function correctMistake() {
    const index = firstMistake(chars, engine.current.typed);
    if (index < 0) return;
    // Record the same corrections as Backspace; never rewrite a scored recording.
    while (engine.current.typed.length > index && !finishing.current) apply('backspace');
    input.current?.focus({ preventScroll: true });
  }

  async function publish() {
    if (!session || !saved) return;
    setSaving(true); setError(''); setNeedsProfile(false);
    try {
      const response = await fetch(`/api/attempts/${session.id}/publish`, { method: 'POST', headers: { 'X-Attempt-Token': session.token } });
      const data = await response.json() as Session & { error?: string; url: string }; if (response.status === 401) setNeedsProfile(true);
      if (!response.ok) throw new Error(data.error || 'Could not publish your result');
      setPublished(data.url);
      if (draft.current) persistDraft({ ...draft.current, published: data.url });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not publish'); } finally { setSaving(false); }
  }

  const ghostAt = ghost ? competitionPosition(ghost.progress, elapsed) : 0;
  const youAt = view.typed.reduce((sum, char, index) => sum + Number(char === chars[index]), 0);
  const mistake = firstMistake(chars, view.typed);
  const mistakeLine = mistake < 0 ? 0 : chars.slice(0, mistake).filter(char => char === '\n').length + 1;
  const nextIsReturn = chars[view.typed.length] === '\n';
  const delta = score && ghost ? score.durationMs - ghost.durationMs : null;
  const runs = useMemo(() => {
    const result: { text: string; state: string; start: number }[] = [];
    chars.forEach((char, index) => {
      const state = index < view.typed.length ? view.typed[index] === char ? 'correct' : 'incorrect' : index === view.typed.length ? 'caret' : 'pending';
      const previous = result[result.length - 1];
      if (previous && previous.state === state && state !== 'caret' && char !== '\n' && !previous.text.endsWith('\n')) previous.text += char;
      else result.push({ text: char, state, start: index });
    });
    return result;
  }, [chars, view.typed]);

  return <section className={`competition-race ${phase === 'running' ? 'is-running' : ''}`} aria-label="Challenge race">
    {!score && <div className="competition-start">{phase === 'ready' || phase === 'preparing' || phase === 'stopped' ? <><button className="competition-button primary" onClick={prepare} disabled={phase === 'preparing'}>{phase === 'preparing' ? 'Preparing your race…' : ghost ? 'Race this run' : 'Start challenge'}</button><p>Online attempts send test input and timing for score validation. Only passage progress is kept for replay.</p></>
        : <><p role="status">{!focused ? phase === 'armed' ? 'Click the passage to begin. The clock has not started.' : 'Click the passage to continue. The clock keeps running.' : view.wrong ? `${view.wrong} uncorrected ${view.wrong === 1 ? 'character' : 'characters'}. First mistake on line ${mistakeLine}.` : nextIsReturn ? 'Press Enter at ↵, including blank lines. The next line indents automatically when enabled.' : inputHint || (phase === 'armed' ? 'Start typing when you are ready. The first key starts the clock.' : 'Keep your rhythm.')}</p>
        {view.wrong > 0 && <button className="competition-button" onClick={correctMistake}>Erase back to first mistake</button>}</>}</div>}

    <div className="competition-rulebar"><span>Complete passage</span><span>Correct every mistake</span><span>{challenge.rules.autoIndent ? 'Auto-indent on' : 'Type every space'}</span></div>
    <div className="competition-scoreboard"><div><small>YOUR TIME</small><strong>{(elapsed / 1000).toFixed(2)}<span>s</span></strong></div>
      <div><small>{ghost ? `BEAT @${ghost.handle}` : 'SET THE FIRST TIME'}</small><strong>{ghost ? (ghost.durationMs / 1000).toFixed(2) : '-'}<span>{ghost ? 's' : ''}</span></strong></div>
      <div><small>{score ? 'ACCURACY' : 'PROGRESS'}</small><strong>{score ? score.accuracy : raceProgress(youAt, chars.length, false)}<span>%</span></strong></div>
    </div>
    <div className="competition-track" aria-label="Race progress"><div><span>You</span><progress max={chars.length} value={youAt} /></div>{ghost && <div className="ghost"><span>@{ghost.handle}</span><progress max={chars.length} value={ghostAt} /></div>}</div>
    {score ? <div className="competition-finish" aria-live="polite"><p className="challenge-kicker">PASSAGE COMPLETE</p><h2>{delta === null ? 'Time set.' : delta < 0 ? `You beat @${ghost!.handle}.` : delta === 0 ? 'An exact tie.' : `${(delta / 1000).toFixed(2)}s to catch @${ghost!.handle}.`}</h2>
      {delta !== null && delta < 0 && <p>{(Math.abs(delta) / 1000).toFixed(2)} seconds ahead.</p>}
      <div className="competition-result-details"><span><b>{score.wpm}</b> WPM</span><span><b>{score.errors}</b> {score.errors === 1 ? 'mistake' : 'mistakes'} corrected</span><span><b>{score.characters}</b> characters typed</span></div>
      <div className="competition-actions"><button className="competition-button primary" disabled={saving} onClick={prepare}>Race again</button>
        {published ? <><button className="competition-button" onClick={async () => { try { await navigator.clipboard.writeText(published); setCopied(true); } catch { setError('Copy the result link below.'); } }}>{copied ? 'Link copied' : 'Copy result link'}</button><a className="competition-button" href={published.replace('https://typearchy.com', '')}>View result ↗</a></>
          : saved ? <button className="competition-button" disabled={saving} onClick={publish}>{saving ? 'Publishing…' : 'Publish my result'}</button>
            : <button className="competition-button" disabled={saving} onClick={() => session && save(session, recording.current)}>{saving ? 'Saving result…' : 'Retry saving'}</button>}
      </div>{published && <a className="competition-result-link" href={published.replace('https://typearchy.com', '')}>{published}</a>}
      {!published && <p className="competition-note">{saved ? 'Validated. Publish to join the standings and share your run.' : 'Your result is kept in this tab while we save it. You can reload and retry.'}</p>}
    </div> : <>
      <div className="competition-prompt-wrap" onClick={() => { if (phase === 'armed' || phase === 'running') input.current?.focus({ preventScroll: true }); }}>
        <div className="competition-prompt" ref={prompt} aria-label="Passage to type">{runs.map(run => <span key={`${run.start}-${run.state}`} className={run.state} data-caret={run.state === 'caret' ? '' : undefined}>{run.text === '\n' ? <><span className="competition-return" aria-label="Enter">↵</span>{'\n'}</> : run.state === 'incorrect' ? run.text.replace(/ /g, '·') : run.text}</span>)}</div>
        <textarea ref={input} className="competition-input" aria-label="Type the challenge passage" disabled={!['armed', 'running'].includes(phase)} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onPaste={event => event.preventDefault()} onDrop={event => event.preventDefault()}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={event => { composing.current = false; const text = event.data.normalize('NFC'); event.currentTarget.value = ''; Array.from(text).forEach(char => apply('input', char)); }}
          onInput={event => { if (composing.current || (event.nativeEvent as InputEvent).isComposing) return; const text = event.currentTarget.value; event.currentTarget.value = ''; Array.from(text.normalize('NFC')).forEach(char => apply('input', char)); }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            setInputHint('');
            if (event.key === 'Backspace') { event.preventDefault(); apply(event.ctrlKey || event.altKey || event.metaKey ? 'word' : 'backspace'); }
            else if (event.key === 'Enter') { event.preventDefault(); apply('input', '\n'); }
            else if (event.key === 'Tab') {
              event.preventDefault();
              const spaces = event.shiftKey ? '' : tabIndent(chars, engine.current.typed, challenge.rules.autoIndent);
              Array.from(spaces).forEach(char => apply('input', char));
              setInputHint(challenge.rules.autoIndent ? 'Indentation is automatic after Enter. Tab keeps your typing focus.' : 'Tab fills up to four leading spaces. Type other spaces normally.');
            } else if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.blur(); }
          }} />
      </div>
      <p className="competition-note">↵ means Enter, including blank lines. Tab stays in the test. Escape releases typing focus.</p>

    </>}
    {error && <div className="competition-error" role="alert">{error}{needsProfile && <p><a href="/account" target="_blank" rel="noopener">Connect your profile in a new tab</a>, then publish here. Your result will stay in this tab.</p>}</div>}
    {challenge.description && <details className="code-context"><summary>About this code</summary><p>{challenge.description}</p><p>Type the passage as written. Understanding it is optional; the explanation is here if you are curious.</p></details>}
    {challenge.attribution && <p className="competition-attribution">{challenge.sourceUrl ? <><span>{challenge.author} · Rails · MIT</span> · <a href={challenge.sourceUrl} target="_blank" rel="noopener noreferrer">Read the original source ↗</a></> : challenge.attribution}</p>}
  </section>;
}
