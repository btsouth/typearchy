'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
type Attempt = { id: string; slug: string; created_at: number; duration_ms: number; wpm: number; accuracy: number; published: number; title: string; moderation: string; visibility: string; creator_visibility: string; challenge_slug: string };

export default function MyAttempts() {
  const requestRevision=useRef(0); const mutating=useRef(false);
  const [cursor,setCursor]=useState<string|null>(null); const [loading,setLoading]=useState(false);
  const [attempts, setAttempts] = useState<Attempt[] | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  const load = useCallback(async (next?: string) => {
    if(mutating.current)return;
    const revision=++requestRevision.current;
    setLoading(true);
    try {
    const response = await fetch('/api/account/attempts' + (next ? `?cursor=${encodeURIComponent(next)}` : '')); const data = await response.json() as { attempts: Attempt[]; error?: string; nextCursor?: string };
    if(revision!==requestRevision.current)return;
    if (!response.ok) { if(response.status===401)setAttempts(null); throw new Error(data.error || 'Could not load your results'); }
    setAttempts(current=>next ? [...(current || []),...data.attempts.filter(row=>!current?.some(old=>old.id===row.id))] : data.attempts); setCursor(data.nextCursor || null); setError('');
    } catch(error) { if(revision===requestRevision.current)throw error; } finally {if(revision===requestRevision.current)setLoading(false);}
  }, []);
  useEffect(() => {
    // The remote read settles before updating component state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(cause => setError(cause.message));
    const refresh = () => { void load().catch(cause => setError(cause.message)); };
    window.addEventListener('focus',refresh);
    return () => window.removeEventListener('focus',refresh);
  }, [load]);
  async function publish(attempt: Attempt) {
    mutating.current=true;requestRevision.current++;setLoading(false);
    setBusy(attempt.id); setError('');
    try {
      const response = await fetch('/api/account/attempts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: attempt.id, published: !attempt.published }) });
      const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error || 'Could not update result');
      setAttempts(current=>current?.map(row=>row.id===attempt.id ? {...row,published:Number(!attempt.published)} : row) || null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update result'); }
    finally { mutating.current=false;setBusy(''); }
  }
  return <section className="my-challenges"><h2>Your challenge results</h2><p>Completed while connected to this profile. Only shared results appear in the standings.</p>
    {error && <div className="competition-error" role="alert"><p>{error}</p><button onClick={()=>void load().catch(cause=>setError(cause.message))}>Retry</button><a href="/account">Open profile</a></div>}{loading && <p role="status">Loading results…</p>}
    {attempts?.map(attempt => <article className="moderation-entry" key={attempt.id}><h3>{attempt.title}</h3>
      <p>{new Date(attempt.created_at).toLocaleString()} · {(attempt.duration_ms / 1000).toFixed(2)}s · {attempt.wpm} WPM · {attempt.accuracy}% accuracy</p>
      <div className="competition-actions"><a className="competition-button" href={`/history/challenges/${attempt.id}`}>View result</a><a className="competition-button" href={`/c/${attempt.challenge_slug}`}>Race again</a>
        <button className="competition-button" disabled={!!busy || (!attempt.published && (attempt.moderation === 'rejected' || attempt.visibility === 'hidden' || attempt.creator_visibility !== 'public'))} onClick={() => void publish(attempt)}>{attempt.published ? 'Stop sharing' : 'Share result'}</button>
        {!!attempt.published && <a className="competition-button" href={`/a/${attempt.slug}`}>View shared result ↗</a>}
      </div>{attempt.moderation === 'rejected' ? <p className="competition-note">This passage was not approved. Your result stays here but cannot be shared.</p>
        : attempt.visibility === 'hidden' || attempt.creator_visibility !== 'public' ? <p className="competition-note">The creator has hidden this passage, so results on it cannot be shared right now.</p>
        : attempt.moderation === 'pending' ? <p className="competition-note">Shareable by link. It stays off your public profile until the passage is reviewed.</p> : null}
    </article>)}
    {cursor && <button disabled={loading} onClick={()=>void load(cursor).catch(cause=>setError(cause.message))}>Load older results</button>}
    {attempts?.length === 0 && <p>No completed challenges yet.</p>}
  </section>;
}
