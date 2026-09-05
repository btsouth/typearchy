'use client';
import { useMemo, useRef, useState } from 'react';
import { parsePracticeBackup, practiceGroup, type PracticeRun } from './lib/practiceHistory';

export default function PracticeHistory({ history, onImport, onRetest, onClear, canRetest }: {
  history: PracticeRun[]; canRetest: (run: PracticeRun) => boolean; onImport: (runs: PracticeRun[]) => void; onRetest: (run: PracticeRun) => void; onClear: () => void;
}) {
  const [filter, setFilter] = useState('all'); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [clearArmed, setClearArmed] = useState(false); const file = useRef<HTMLInputElement>(null);
  const groups = useMemo(() => [...new Map(history.map(run => [practiceGroup(run), `${run.mode.toUpperCase()} / ${run.target}`])).entries()], [history]);
  const shown = filter === 'all' ? history : history.filter(run => practiceGroup(run) === filter);
  const trend = shown.slice(0,12).reverse();
  const max = Math.max(1,...trend.map(run=>run.wpm));
  function exportHistory() {
    const blob = new Blob([JSON.stringify({format:'typearchy-practice',version:1,runs:history},null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href=url; link.download='typearchy-practice.json'; link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="web-game-history" onClick={event=>event.stopPropagation()}>
    <div className="web-game-history-head"><div><span>LOCAL RUN HISTORY</span><strong>{history.length} / 500 RUNS</strong></div>
      <div><button type="button" onClick={exportHistory} disabled={!history.length}>EXPORT</button><button type="button" onClick={()=>file.current?.click()}>IMPORT</button>
        {history.length > 0 && <button type="button" onClick={()=>setClearArmed(true)}>CLEAR</button>}</div></div>
    <input ref={file} type="file" accept="application/json,.json" hidden onChange={async event=>{
      const selected=event.target.files?.[0]; event.target.value=''; if (!selected) return;
      setError(''); setNotice('');
      try { if(selected.size>2_000_000) throw new Error('Choose a backup under 2 MB'); const runs=parsePracticeBackup(await selected.text()); onImport(runs); setNotice('Backup merged. Matching run IDs were kept once.'); }
      catch(cause) {setError(cause instanceof Error ? cause.message : 'Could not import backup');}
    }} />
    {clearArmed && <div className="practice-confirm"><p>Clear this browser’s practice history? Export a backup first if you want to keep it.</p><button type="button" onClick={()=>{onClear();setClearArmed(false);setFilter('all');}}>Clear local history</button><button type="button" onClick={()=>setClearArmed(false)}>Keep history</button></div>}
    <label className="practice-filter">Compare runs<select value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">All practice</option>{groups.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    {filter !== 'all' && trend.length > 0 && <div className="practice-trend"><p>Best: {Math.max(...shown.map(run=>run.wpm))} WPM · Recent {trend.length} runs</p>
      <svg viewBox="0 0 600 110" role="img" aria-label={`Recent WPM: ${trend.map(run=>run.wpm).join(', ')}`}>
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={trend.map((run,index)=>`${20+index*560/Math.max(1,trend.length-1)},${95-run.wpm/max*75}`).join(' ')} />
        {trend.map((run,index)=><circle key={run.id} cx={20+index*560/Math.max(1,trend.length-1)} cy={95-run.wpm/max*75} r="4" fill="currentColor" />)}
      </svg></div>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {shown.length ? <div className="web-game-history-list">{shown.map(run=><button type="button" key={run.id} disabled={!canRetest(run)} title={canRetest(run) ? "Retry this passage" : "The original passage is not available in this browser"} onClick={()=>onRetest(run)}><span>{new Date(run.timestamp).toLocaleDateString(undefined,{month:'short',day:'numeric'}).toUpperCase()}</span><strong>{run.mode.toUpperCase()} / {run.target}</strong><b>{run.wpm} WPM</b><i>{run.accuracy}%</i></button>)}</div> : <div className="web-game-empty">FINISH A TEST TO START LOCAL HISTORY.</div>}
  </div>;
}
