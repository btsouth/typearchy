'use client';

import { useEffect, useRef, useState } from 'react';
import { cumulativeWordsAt, paceAt, racePosition, replayProgress } from './ghostEngine';

type GhostRun = {
  slug: string;
  handle: string;
  mode: string;
  target: string;
  wpm: number;
  accuracy: number;
  consistency: number;
  date: string;
  duration: number;
  pace: number[];
};

export default function PinnedGhost({ run }: { run: GhostRun }) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const origin = useRef(0);
  const replayLengthMs = Math.max(7000, Math.min(20_000, run.duration * 500));

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
  }, [playing, replayLengthMs]);

  const currentWpm = paceAt(run.pace, progress);
  const words = cumulativeWordsAt(run.pace, progress, run.duration);
  const finishWords = cumulativeWordsAt(run.pace, 1, run.duration);
  const activeSample = Math.min(run.pace.length - 1, Math.floor(progress * run.pace.length));
  const elapsed = Math.round(progress * run.duration);
  const maximumPace = Math.max(1, ...run.pace);

  const toggle = () => {
    if (playing) return setPlaying(false);
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
    <article className="profile-ghost-card" aria-label={`Replay ${run.handle}'s pinned ${run.wpm} words per minute run`}>
      <div className="profile-ghost-summary">
        <div className="profile-run-meta"><span>PRIMARY PIN / {run.mode} / {run.target}</span><small>{run.date}</small></div>
        <div className="profile-run-score"><b>{Math.round(run.wpm)}</b><span>WPM</span></div>
        <div className="profile-run-metrics"><span><small>ACC</small>{run.accuracy}%</span><span><small>CONSISTENCY</small>{run.consistency}%</span><span><small>DURATION</small>{run.duration} SEC</span></div>
        <div className="profile-ghost-actions">
          <button type="button" onClick={toggle}>{playing ? 'PAUSE' : progress >= 1 ? 'REPLAY' : progress > 0 ? 'RESUME' : 'WATCH RUN'}</button>
          <a href={`/r/${run.slug}`}>CHALLENGE RUN</a>
        </div>
      </div>

      <div className="ghost-tape ghost-tape-compact">
        <div className="ghost-scoreboard ghost-scoreboard-compact ghost-scoreboard-single">
          <span><small>{run.handle.toUpperCase()} / RECORDED PACE</small><b>{currentWpm}</b> WPM</span>
          <i>{Math.round(progress * 100)}%</i>
        </div>
        <div className="ghost-race ghost-race-single">
          <div className="ghost-lane"><span>GHOST</span><div><i className="runner player" style={{ left: `${racePosition(words, finishWords)}%` }}>▲</i></div><b>{words.toFixed(1)} WORDS</b></div>
        </div>
        <div className="ghost-pace-strip" aria-hidden="true">
          {run.pace.map((value, index) => <i className={index <= activeSample ? 'passed' : ''} key={`${value}-${index}`} style={{ height: `${Math.max(8, value / maximumPace * 100)}%` }} />)}
        </div>
        <div className="ghost-scrubber">
          <span>{playing ? 'PLAYING' : progress >= 1 ? 'FINISHED' : progress > 0 ? 'PAUSED' : 'READY'}</span>
          <input type="range" min="0" max="1000" value={Math.round(progress * 1000)} onChange={(event) => seek(Number(event.target.value) / 1000)} aria-label="Ghost replay position" />
          <span>0:{elapsed.toString().padStart(2, '0')} / {Math.floor(run.duration / 60)}:{(run.duration % 60).toString().padStart(2, '0')}</span>
        </div>
      </div>
    </article>
  );
}
