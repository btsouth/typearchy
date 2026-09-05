'use client';
import {useEffect,useState} from 'react';
import ResultCard,{type ResultCardData} from '../../../results/ResultCard';
export default function PrivateChallengeResult({id}:{id:string}) {
 const [result,setResult]=useState<ResultCardData|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController(); void fetch(`/api/account/attempts/${encodeURIComponent(id)}`,{signal:controller.signal}).then(async response=>{const data=await response.json() as {result:ResultCardData;error?:string};if(!response.ok)throw new Error(data.error || 'Could not load result');setResult(data.result);setError('');}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});return()=>controller.abort();},[id,retry]);
 return <><p className="private-result-back"><a href="/history?view=challenges">Back to history</a></p>{error ? <div className="challenge-shell" role="alert"><p>{error}</p><button onClick={()=>setRetry(value=>value+1)}>Retry</button><a href="/account">Open profile</a></div> : result ? <ResultCard result={result} privateResult/> : <p role="status">Loading your result…</p>}</>;
}
