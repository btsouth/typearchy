'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const runPace = [74, 82, 88, 96, 101, 98, 106, 110, 104, 108, 102, 104];
const ghostPace = [70, 78, 84, 91, 96, 94, 100, 103, 99, 101, 97, 98];
const replayLength = 15_000;

function sampleAt(samples: number[], progress: number) {
  const position = progress * (samples.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(samples.length - 1, lower + 1);
  const mix = position - lower;
  return Math.round(samples[lower] + (samples[upper] - samples[lower]) * mix);
}

export default function PinnedGhost() {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const startedAt = useRef(0);
  const startProgress = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(1, startProgress.current + (now - startedAt.current) / replayLength);
      setProgress(next);
      if (next >= 1) {
        setPlaying(false);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing]);

  const runWpm = useMemo(() => sampleAt(runPace, progress), [progress]);
  const ghostWpm = useMemo(() => sampleAt(ghostPace, progress), [progress]);
  const elapsed = Math.round(progress * 30);
  const activeSample = Math.min(runPace.length - 1, Math.floor(progress * runPace.length));

  const toggle = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    const nextStart = progress >= 1 ? 0 : progress;
    if (progress >= 1) setProgress(0);
    startProgress.current = nextStart;
    startedAt.current = performance.now();
    setPlaying(true);
  };

  const seek = (value: number) => {
    setPlaying(false);
    setProgress(value);
  };

  return (
    <section className="pinned-ghost-section">
      <div className="pinned-ghost-copy">
        <p className="section-tag">01 / PINNED GHOST</p>
        <h2>Watch the run.<br />Then take it down.</h2>
        <p>@bts pinned this 104 WPM Sprint. Replay the pace, inspect the finish, or take the same 30-second challenge.</p>
        <div className="pinned-ghost-actions">
          <button type="button" onClick={toggle}>{playing ? 'PAUSE GHOST' : progress >= 1 ? 'REPLAY GHOST' : 'WATCH GHOST'}</button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/r/F4S8RP">CHALLENGE @BTS</a>
        </div>
        <small>PACE REPLAY ONLY / NO TYPED TEXT OR KEYSTROKES</small>
      </div>

      <div className="ghost-tape" aria-label="Pinned ghost replay of a 104 words per minute Sprint run">
        <div className="ghost-tape-head"><strong>GHOST TAPE / 001</strong><span>SPRINT / 30 SEC / 2× REPLAY</span></div>
        <div className="ghost-scoreboard">
          <span><small>@BTS</small><b>{runWpm}</b> WPM</span>
          <i>{runWpm - ghostWpm >= 0 ? '+' : ''}{runWpm - ghostWpm}</i>
          <span><small>PB GHOST</small><b>{ghostWpm}</b> WPM</span>
        </div>
        <div className="ghost-race">
          <div className="ghost-lane"><span>@BTS</span><div><i className="runner player" style={{ left: `${Math.min(97, progress * 97)}%` }}>▲</i></div><b>{Math.round(progress * 52)} WORDS</b></div>
          <div className="ghost-lane"><span>GHOST</span><div><i className="runner previous" style={{ left: `${Math.min(94, progress * 91.5)}%` }}>◇</i></div><b>{Math.round(progress * 49)} WORDS</b></div>
        </div>
        <div className="ghost-pace-strip" aria-hidden="true">
          {runPace.map((value, index) => <i className={index <= activeSample ? 'passed' : ''} key={`${value}-${index}`} style={{ height: `${((value - 65) / 50) * 100}%` }} />)}
        </div>
        <div className="ghost-scrubber">
          <span>0:00</span>
          <input type="range" min="0" max="1000" value={Math.round(progress * 1000)} onChange={(event) => seek(Number(event.target.value) / 1000)} aria-label="Ghost replay position" />
          <span>0:{elapsed.toString().padStart(2, '0')} / 0:30</span>
        </div>
        <div className="ghost-tape-foot"><span>{playing ? 'REPLAYING' : progress >= 1 ? 'FINISHED +6 WPM' : progress > 0 ? 'PAUSED' : 'READY'}</span><span>PINNED AUG 27</span></div>
      </div>
    </section>
  );
}
