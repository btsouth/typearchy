'use client';

import { useEffect, useRef, useState } from 'react';
import { cumulativeWordsAt, paceAt, racePosition, replayProgress } from './ghostEngine';

const runPace = [88, 96, 102, 108, 112, 106, 110, 116, 108, 112, 104, 104];
const ghostPace = [84, 90, 96, 100, 104, 98, 102, 106, 98, 100, 98, 98];
const testLengthSeconds = 30;
const replayLengthMs = 15_000;

export default function PinnedGhost() {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const origin = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = (now: number) => {
      const next = replayProgress(origin.current, now, replayLengthMs);
      setProgress(next);
      if (next < 1) frame = window.requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing]);

  const runWpm = paceAt(runPace, progress);
  const ghostWpm = paceAt(ghostPace, progress);
  const runWords = cumulativeWordsAt(runPace, progress, testLengthSeconds);
  const ghostWords = cumulativeWordsAt(ghostPace, progress, testLengthSeconds);
  const finishWords = Math.max(cumulativeWordsAt(runPace, 1, testLengthSeconds), cumulativeWordsAt(ghostPace, 1, testLengthSeconds));
  const activeSample = Math.min(runPace.length - 1, Math.floor(progress * runPace.length));
  const elapsed = Math.round(progress * testLengthSeconds);

  const toggle = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    const next = progress >= 1 ? 0 : progress;
    if (progress >= 1) setProgress(0);
    origin.current = performance.now() - next * replayLengthMs;
    setPlaying(true);
  };

  const seek = (value: number) => {
    setPlaying(false);
    setProgress(value);
  };

  return (
    <article className="profile-ghost-card" aria-label="Pinned ghost replay preview of a 104 words per minute Sprint run">
      <div className="profile-ghost-summary">
        <div className="profile-run-meta"><span>PRIMARY PIN / SPRINT / 30 SEC</span><small>AUG 27</small></div>
        <div className="profile-run-score"><b>104</b><span>WPM</span></div>
        <div className="profile-run-metrics"><span><small>ACC</small>97%</span><span><small>CONSISTENCY</small>90%</span><span><small>VS PB GHOST</small>+6 WPM</span></div>
        <div className="profile-ghost-actions">
          <button type="button" onClick={toggle}>{playing ? 'PAUSE' : progress >= 1 ? 'REPLAY' : progress > 0 ? 'RESUME' : 'WATCH GHOST'}</button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/r/F4S8RP">OPEN DEMO RUN</a>
        </div>
      </div>

      <div className="ghost-tape ghost-tape-compact">
        <div className="ghost-scoreboard ghost-scoreboard-compact">
          <span><small>@BTS PACE</small><b>{runWpm}</b> WPM</span>
          <i>{runWpm - ghostWpm >= 0 ? '+' : ''}{runWpm - ghostWpm}</i>
          <span><small>PB GHOST</small><b>{ghostWpm}</b> WPM</span>
        </div>
        <div className="ghost-race">
          <div className="ghost-lane"><span>@BTS</span><div><i className="runner player" style={{ left: `${racePosition(runWords, finishWords)}%` }}>▲</i></div><b>{runWords.toFixed(1)} WORDS</b></div>
          <div className="ghost-lane"><span>GHOST</span><div><i className="runner previous" style={{ left: `${racePosition(ghostWords, finishWords)}%` }}>◇</i></div><b>{ghostWords.toFixed(1)} WORDS</b></div>
        </div>
        <div className="ghost-pace-strip" aria-hidden="true">
          {runPace.map((value, index) => <i className={index <= activeSample ? 'passed' : ''} key={`${value}-${index}`} style={{ height: `${((value - 65) / 50) * 100}%` }} />)}
        </div>
        <div className="ghost-scrubber">
          <span>{playing ? 'PLAYING' : progress >= 1 ? 'FINISHED' : progress > 0 ? 'PAUSED' : 'READY'}</span>
          <input type="range" min="0" max="1000" value={Math.round(progress * 1000)} onChange={(event) => seek(Number(event.target.value) / 1000)} aria-label="Ghost replay position" />
          <span>0:{elapsed.toString().padStart(2, '0')} / 0:30</span>
        </div>
      </div>
    </article>
  );
}
