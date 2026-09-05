'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { competitionPosition } from '../competitionEngine';
import { type ResultTheme, themeStyle } from '../lib/resultTheme';

export type ResultCardData = {
  url: string; title: string; handle: string; category: string; durationMs: number;
  wpm: number; rawWpm: number; accuracy: number; errors: number; consistency?: number;
  challengeUrl: string; standingsUrl?: string; source?: string; createdAt?: number;
  passage?: string; progress?: number[][]; pace?: number[]; theme: ResultTheme;
  validated: boolean; bestTimeMs?: number;
};

export default function ResultCard({ result }: { result: ResultCardData }) {
  const [elapsed, setElapsed] = useState(0); const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); const [copied, setCopied] = useState(false); const [message, setMessage] = useState('');
  const elapsedRef = useRef(0); const passageRef = useRef<HTMLDivElement>(null);
  const characters = useMemo(()=>Array.from(result.passage || ''),[result.passage]);
  const position = result.progress ? Math.floor(competitionPosition(result.progress, elapsed)) : 0;
  useEffect(() => {
    if (!playing) return;
    const origin = performance.now(); const initial = elapsedRef.current; let frame = 0;
    function tick(now: number) {
      const next = Math.min(result.durationMs, initial + (now - origin) * speed);
      elapsedRef.current=next; setElapsed(next);
      if(next < result.durationMs) frame=requestAnimationFrame(tick); else setPlaying(false);
    }
    frame=requestAnimationFrame(tick); return ()=>cancelAnimationFrame(frame);
  },[playing,speed,result.durationMs]);
  useEffect(()=>{
    const caret = passageRef.current?.querySelector<HTMLElement>('[data-playback-caret]');
    if(caret && passageRef.current) passageRef.current.scrollTop=Math.max(0,caret.offsetTop-passageRef.current.offsetTop-65);
  },[position]);
  const points = result.progress?.length ? result.progress.map(([time,value])=>[time/result.durationMs, value/Math.max(1,characters.length)])
    : (result.pace || []).map((value,index,all)=>[index/Math.max(1,all.length-1),value/Math.max(1,...all)]);
  const chart = points.map(([x,y])=>`${20+x*960},${140-y*120}`).join(' ');
  async function copyLink() {
    try { await navigator.clipboard.writeText(result.url); setCopied(true); setMessage(''); }
    catch { setMessage('Select the result URL below to copy it.'); }
  }
  async function share() {
    if(navigator.share) {
      try { await navigator.share({title:`${result.title} by @${result.handle}`,url:result.url}); }
      catch(cause) { if(!(cause instanceof Error && cause.name==='AbortError')) await copyLink(); }
    } else await copyLink();
  }
  function seek(value: number) { setPlaying(false); elapsedRef.current=value; setElapsed(value); }
  function togglePlayback() {
    if(!playing && elapsedRef.current>=result.durationMs) {elapsedRef.current=0;setElapsed(0);}
    setPlaying(value=>!value);
  }
  return <article className="live-result-card" style={themeStyle(result.theme)} aria-label={`Result by ${result.handle}`}>
    <header className="live-result-top"><a className="wordmark" href="/play"><span className="mark">T</span><span>TYPEARCHY</span></a><span>{result.theme.name}</span></header>
    <div className="live-result-title"><p>{result.category} · <a href={`/u/${result.handle}`}>@{result.handle}</a></p><h1>{result.title}</h1></div>
    <div className="live-result-score"><div><strong>{result.wpm}</strong><span>WPM</span></div><div className="live-result-time"><strong>{(result.durationMs/1000).toFixed(2)}<span>s</span></strong><span>{result.validated ? 'Complete passage' : 'Practice result'}</span></div></div>
    <dl className="live-result-metrics"><div><dt>Accuracy</dt><dd>{result.accuracy}<small>%</small></dd></div><div><dt>Raw speed</dt><dd>{result.rawWpm}<small>WPM</small></dd></div><div><dt>Mistakes</dt><dd>{result.errors}</dd></div><div><dt>{result.validated ? 'Rule' : 'Consistency'}</dt><dd className={result.validated ? 'metric-rule' : ''}>{result.validated ? 'Correct every error' : `${result.consistency ?? 0}%`}</dd></div></dl>
    <div className="live-result-actions"><a className="result-race-button" href={result.challengeUrl}>Race this run <span>↗</span></a><button type="button" onClick={()=>void share()}>Share result</button><button type="button" onClick={()=>void copyLink()}>{copied ? 'Link copied' : 'Copy link'}</button>{result.standingsUrl && <a href={result.standingsUrl}>Standings</a>}</div>
    {!!points.length && <section className="live-result-chart" aria-label={result.progress ? 'Passage progress replay' : 'Words per minute over time'}>
      <header><span>{result.progress ? 'Passage progress' : 'Pace'}</span><span>{result.progress ? `${(elapsed/1000).toFixed(2)} / ${(result.durationMs/1000).toFixed(2)}s` : `${result.pace?.length || 0} pace samples`}</span></header>
      <svg viewBox="0 0 1000 160" role="img" aria-label={result.progress ? 'Recorded passage progress from start to finish' : `WPM samples: ${result.pace?.join(', ')}`}><path d="M20 20H980 M20 80H980 M20 140H980" className="result-chart-grid"/><polyline points={chart} className="result-chart-line" />
        {result.progress && <line x1={20+elapsed/result.durationMs*960} x2={20+elapsed/result.durationMs*960} y1="10" y2="145" className="result-chart-playhead" />}
      </svg>
      {result.progress && <div className="live-result-playback"><button type="button" onClick={togglePlayback}>{playing ? 'Pause' : elapsed>=result.durationMs ? 'Replay' : 'Play run'}</button><input type="range" min="0" max={result.durationMs} step="10" value={elapsed} onChange={event=>seek(Number(event.target.value))} aria-label="Replay position" aria-valuetext={`${(elapsed/1000).toFixed(1)} seconds`} /><select value={speed} onChange={event=>setSpeed(Number(event.target.value))} aria-label="Playback speed"><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></div>}
    </section>}
    {characters.length>0 && <details className="live-result-passage"><summary>Passage and playback</summary><div ref={passageRef}><span className="played">{characters.slice(0,position).join('')}</span><span data-playback-caret>{characters[position] || ''}</span><span>{characters.slice(position+1).join('')}</span></div>{result.source && <p>{result.source}</p>}</details>}
    {result.bestTimeMs !== undefined && <p className="live-result-comparison">{result.durationMs<=result.bestTimeMs ? 'This run matches the leading time.' : `${((result.durationMs-result.bestTimeMs)/1000).toFixed(2)}s behind the leading time.`}</p>}

    <footer className="live-result-footer"><span>{result.validated ? 'Score calculated from recorded input' : 'Score reported by the player’s device'}</span>{result.createdAt && <time dateTime={new Date(result.createdAt).toISOString()}>{new Date(result.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}</time>}</footer>
    {message && <p role="status">{message}</p>}<a className="live-result-url" href={result.url}>{result.url.replace('https://','')}</a>
  </article>;
}
