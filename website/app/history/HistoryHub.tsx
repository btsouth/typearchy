'use client';
import {useEffect,useState,useRef} from 'react';
import {useRouter} from 'next/navigation';
import PracticeHistory from '../PracticeHistory';
import MyAttempts from '../account/MyAttempts';
import {loadHistory,saveHistoryRuns,clearHistory,subscribeHistory} from '../lib/historyStore';
import {savedPractice} from '../lib/savedPractice';
import {parsePracticeBackup} from '../lib/practiceHistory';
import type {PracticeRun} from '../lib/practiceHistory';
export default function HistoryHub({initialView}:{initialView?:string}) {
 const recoveryFile=useRef<HTMLInputElement>(null);
 const router=useRouter(); const [tab,setTab]=useState(initialView==='challenges' ? 'challenges' : 'practice'); const [runs,setRuns]=useState<PracticeRun[]|null>(null); const [error,setError]=useState('');
 async function refresh(){ try {setRuns(await loadHistory());setError('');} catch(cause){setError(cause instanceof Error ? cause.message : 'Could not load history. Your stored data has not been removed.');} }
 useEffect(()=>{void Promise.resolve().then(refresh); return subscribeHistory(()=>void refresh());},[]);
 return <div className="history-hub"><div className="history-tabs"><button aria-pressed={tab==='practice'} onClick={()=>{setTab('practice');window.history.replaceState(null,'','/history');}}>Practice on this device</button><button aria-pressed={tab==='challenges'} onClick={()=>{setTab('challenges');window.history.replaceState(null,'','/history?view=challenges');}}>Profile challenge results</button></div>{tab==='challenges' ? <MyAttempts/> : <>{error && <div role="alert"><p>{error}</p><button onClick={()=>void refresh()}>Retry loading history</button><button onClick={()=>{try {const raw=localStorage.getItem('typearchy.web.runs.v1');if(!raw)throw new Error('No legacy backup is available.');const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='typearchy-original-history.json';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(cause){setError(cause instanceof Error ? cause.message : 'Could not export original history.');}}}>Export original data</button><button onClick={()=>recoveryFile.current?.click()}>Import a valid backup</button><input ref={recoveryFile} type="file" accept=".json" hidden onChange={async event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;try{if(file.size>50_000_000)throw new Error('Choose a backup under 50 MB');await saveHistoryRuns(parsePracticeBackup(await file.text()),false);await refresh();}catch(cause){setError(cause instanceof Error ? cause.message : 'Could not restore backup.');}}}/></div>}{runs ? <PracticeHistory history={runs} canRetest={run=>!!savedPractice(run)} onRetest={run=>router.push(`/play?run=${encodeURIComponent(run.id)}`)} onImport={async incoming=>{await saveHistoryRuns(incoming,false);await refresh();}} onClear={async()=>{await clearHistory();await refresh();}}/> : !error && <p role="status">Loading your history…</p>}</>}</div>;
}
