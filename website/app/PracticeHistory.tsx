'use client';
import { useRef, useState } from 'react';
import { parsePracticeBackup, practiceGroup, type PracticeRun } from './lib/practiceHistory';
import { learningProfile } from './learningEngine';
import { practiceLabel } from './lib/savedPractice';

export default function PracticeHistory({ history, onImport, onRetest, onClear, canRetest }: {
  history: PracticeRun[]; canRetest: (run: PracticeRun) => boolean; onImport: (runs: PracticeRun[]) => Promise<void>; onRetest: (run: PracticeRun) => void; onClear: () => Promise<void>;
}) {
  const [rangeNow,setRangeNow] = useState(()=>Date.now());
  const [filter, setFilter] = useState('all'); const [days, setDays] = useState('all'); const [comparison, setComparison] = useState('');
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(30); const [clearArmed, setClearArmed] = useState(false); const file = useRef<HTMLInputElement>(null);
  const learning = learningProfile(history);
  const dateRange = days === 'all' ? history : history.filter(run => Date.parse(run.timestamp) >= rangeNow - Number(days)*86400000);
  const shown = filter === 'all' ? dateRange : dateRange.filter(run => run.mode === filter);
  const eligible = dateRange.filter(run => !run.interrupted && run.completed !== false);
  const groups = [...new Map(eligible.map(run => [practiceGroup(run), `${practiceLabel(run)}${['daily','quote','drill','custom'].includes(run.mode) ? ` · ${(run.passage || 'Original passage').slice(0,38)}` : ''} · saved ${new Date(run.timestamp).toLocaleDateString()}`])).entries()];
  const group = groups.some(([key]) => key === comparison) ? comparison : groups[0]?.[0];
  const comparable = eligible.filter(run => practiceGroup(run) === group);
  const trend = comparable.slice(0,30).reverse(); const max = Math.max(1,...trend.map(run => run.wpm));
  const mean = (runs: PracticeRun[], key: 'wpm' | 'accuracy') => runs.length ? Math.round(runs.reduce((total, run) => total + run[key],0)/runs.length*10)/10 : 0;
  function exportHistory() {
    const blob = new Blob([JSON.stringify({format:'typearchy-practice',version:1,runs:history},null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href=url; link.download='typearchy-practice.json'; link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="web-game-history" onClick={event=>event.stopPropagation()}>
    <header className="history-heading"><div><h2>Your practice</h2><p>Saved in this browser. Your profile does not sync this history.</p></div><details><summary>Manage history</summary><div className="history-management"><button type="button" onClick={exportHistory} disabled={!history.length}>Export backup</button><button type="button" disabled={busy} onClick={()=>file.current?.click()}>Import backup</button>{history.length > 0 && <button type="button" disabled={busy} onClick={()=>setClearArmed(true)}>Clear history</button>}</div></details></header>
    <input ref={file} type="file" accept="application/json,.json" hidden onChange={async event=>{
      const selected=event.target.files?.[0]; event.target.value=''; if (!selected) return;
      setError(''); setNotice(''); setBusy(true);
      try { if(selected.size>50_000_000) throw new Error('Choose a backup under 50 MB'); const runs=parsePracticeBackup(await selected.text()); await onImport(runs); setNotice('Backup merged. Existing runs were preserved.'); }
      catch(cause) {setError(cause instanceof Error ? cause.message : 'Could not import backup');} finally { setBusy(false); }
    }} />
    {clearArmed && <div className="practice-confirm"><p>Clear this browser’s practice history? Export a backup first. Shared results and other devices are unaffected.</p><button type="button" disabled={busy} onClick={async ()=>{setBusy(true); try { await onClear();setClearArmed(false);setFilter('all');setNotice('Practice history cleared from this browser.'); } catch { setError('Could not clear history. Your saved runs are unchanged.'); } finally {setBusy(false);}}}>Clear local history</button><button type="button" onClick={()=>setClearArmed(false)}>Keep history</button></div>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <div className="history-filters"><label>Time range<select aria-label="Time range" value={days} onChange={event=>{setDays(event.target.value);setRangeNow(Date.now());setLimit(30);}}><option value="all">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label></div>
    <dl className="history-overview"><div><dt>Practice runs</dt><dd>{dateRange.length}</dd></div><div><dt>Time practiced</dt><dd>{Math.round(dateRange.reduce((sum,run)=>sum+(run.durationMs || 0),0)/60000)} min</dd></div><div><dt>Completed without pausing</dt><dd>{eligible.length}</dd></div></dl>
    {groups.length > 0 && <section className="history-progress" aria-label="Practice progress"><h3>Your progress</h3><label>Compare the same test<select aria-label="Compare the same test" value={group} onChange={event=>setComparison(event.target.value)}>{groups.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <p>{comparable.length} comparable runs · Best {Math.max(...comparable.map(run=>run.wpm))} WPM · Average accuracy {mean(comparable,'accuracy')}%</p>
      {trend.length > 1 ? <><svg viewBox="0 0 600 130" role="img" aria-label={`Speed in WPM, oldest to newest: ${trend.map(run=>run.wpm).join(', ')}`}><path d="M50 15V100H580" fill="none" stroke="currentColor" opacity=".3"/><text x="0" y="22" fontSize="10" fill="currentColor">{max} WPM</text><text x="20" y="102" fontSize="10" fill="currentColor">0</text><polyline fill="none" stroke="currentColor" strokeWidth="2" points={trend.map((run,index)=>`${50+index*530/Math.max(1,trend.length-1)},${95-run.wpm/max*75}`).join(' ')} />{trend.map((run,index)=><circle key={run.id} cx={50+index*530/Math.max(1,trend.length-1)} cy={95-run.wpm/max*75} r="4" fill="currentColor"><title>{new Date(run.timestamp).toLocaleString()}: {run.wpm} WPM, {run.accuracy}% accuracy</title></circle>)}</svg><p className="history-chart-caption">{new Date(trend[0].timestamp).toLocaleDateString()} to {new Date(trend.at(-1)!.timestamp).toLocaleDateString()} · Latest {trend.length} comparable runs</p><details><summary>View progress values</summary><ul>{trend.map(run=><li key={run.id}>{new Date(run.timestamp).toLocaleString()} · {run.wpm} WPM · {run.accuracy}% accuracy</li>)}</ul></details></> : <p>Finish another test with these settings to start a trend.</p>}
      {comparable.length >= 10 && <p>Latest 5 runs: {mean(comparable.slice(0,5),'wpm')} WPM average. Previous 5: {mean(comparable.slice(5,10),'wpm')} WPM. Compare accuracy too; faster is not always better.</p>}
      <p className="competition-note">Paused and incomplete runs stay in your history but do not count toward performance comparisons. Older runs without recorded duration do not add to practice time.</p>
    </section>}
    {learning.keys.length > 0 && <section className="history-drills"><h3>What to practice next</h3><p>Frequent mistypes from recent practice, measured against how often you typed each key.</p><ul>{learning.keys.slice(0,3).map(row=><li key={row.key}><kbd>{row.key}</kbd> · {row.errors} misses in {row.attempts} attempts</li>)}</ul><a href="/play?practice=drill">Practice these patterns</a></section>}
    <div className="history-heading"><h3>Previous runs</h3><label>Practice type<select aria-label="Practice type" value={filter} onChange={event=>{setFilter(event.target.value);setLimit(30);}}><option value="all">All practice</option>{[...new Set(history.map(run=>run.mode))].map(mode=><option key={mode} value={mode}>{practiceLabel(history.find(run=>run.mode===mode)!).split(' · ')[0]}</option>)}</select></label></div>
    {shown.length ? <><div className="web-game-history-list">{shown.slice(0,limit).map(run=><button type="button" key={run.id} title={canRetest(run) ? 'View result and retry' : 'View result. Original passage unavailable.'} onClick={()=>onRetest(run)}><span>{new Date(run.timestamp).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}<small>{new Date(run.timestamp).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</small></span><strong>{practiceLabel(run)}</strong><b>{run.wpm} WPM<small>{run.interrupted ? 'Paused' : run.completed === false ? 'Incomplete' : run.publicSlug ? 'Shared' : 'On this device'}</small></b><i>{run.accuracy}%<small>accuracy</small></i></button>)}</div><p>Showing {Math.min(limit,shown.length)} of {shown.length} runs</p>{shown.length>limit && <button type="button" onClick={()=>setLimit(value=>value+30)}>Load more runs</button>}</> : <p className="web-game-empty">{history.length ? 'No runs match these filters.' : 'Finish a test to see your runs and progress here.'}</p>}
  </div>;
}
