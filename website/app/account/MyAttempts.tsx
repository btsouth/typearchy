'use client';
import { useCallback, useEffect, useState } from 'react';
type Attempt = { id: string; slug: string; duration_ms: number; wpm: number; accuracy: number; published: number; title: string; moderation: string; visibility: string; creator_visibility: string; challenge_slug: string };

export default function MyAttempts() {
  const [attempts, setAttempts] = useState<Attempt[] | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/account/attempts'); const data = await response.json() as { attempts: Attempt[]; error?: string };
    if (!response.ok) throw new Error(data.error || 'Could not load your results');
    setAttempts(data.attempts);
  }, []);
  useEffect(() => {
    // The remote read settles before updating component state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(cause => setError(cause.message));
  }, [load]);
  async function publish(attempt: Attempt) {
    setBusy(attempt.id); setError('');
    try {
      const response = await fetch('/api/account/attempts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: attempt.id, published: !attempt.published }) });
      const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error || 'Could not update result');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update result'); }
    finally { setBusy(''); }
  }
  return <section className="my-challenges"><h2>Your challenge results</h2><p>Completed while connected to this profile. Only shared results appear in the standings.</p>
    {error && <p className="competition-error" role="alert">{error}</p>}
    {attempts?.map(attempt => <article className="moderation-entry" key={attempt.id}><h3>{attempt.title}</h3>
      <p>{(attempt.duration_ms / 1000).toFixed(2)}s · {attempt.wpm} WPM · {attempt.accuracy}% accuracy</p>
      <div className="competition-actions"><a className="competition-button" href={`/c/${attempt.challenge_slug}`}>Race again</a>
        <button className="competition-button" disabled={busy === attempt.id || (!attempt.published && (attempt.moderation === 'rejected' || attempt.visibility === 'hidden' || attempt.creator_visibility !== 'public'))} onClick={() => void publish(attempt)}>{attempt.published ? 'Stop sharing' : 'Share result'}</button>
        {!!attempt.published && <a className="competition-button" href={`/a/${attempt.slug}`}>View shared result ↗</a>}
      </div>{attempt.moderation === 'rejected' ? <p className="competition-note">This passage was not approved. Your result stays here but cannot be shared.</p>
        : attempt.visibility === 'hidden' || attempt.creator_visibility !== 'public' ? <p className="competition-note">The creator has hidden this passage, so results on it cannot be shared right now.</p>
        : attempt.moderation === 'pending' ? <p className="competition-note">Shareable by link. It stays off your public profile until the passage is reviewed.</p> : null}
    </article>)}
    {attempts?.length === 0 && <p>No completed challenges yet.</p>}
  </section>;
}
