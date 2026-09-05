'use client';

import { useCallback, useEffect, useState } from 'react';

type Challenge = { slug: string; title: string; language: string; visibility: string; moderation: string; review_note: string };

export default function MyChallenges() {
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/account/challenges');
      const data = await response.json() as { challenges: Challenge[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not load your challenges');
      setChallenges(data.challenges);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load your challenges'); }
  }, []);
  useEffect(() => {
    // Loading remote data only updates state after the request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  async function changeVisibility(slug: string, visibility: string) {
    setBusy(slug); setError('');
    try {
      const response = await fetch(`/api/challenges/${slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visibility }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not change visibility');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not change visibility'); }
    finally { setBusy(''); }
  }
  return <section className="my-challenges"><h2>Your challenges</h2><p>Saved passages stay here, including those awaiting review.</p>
    <a className="competition-button" href="/challenges/new">Create a challenge</a>
    {error && <p className="competition-error" role="alert">{error}</p>}
    {!challenges && !error && <p role="status">Loading challenges…</p>}
    {challenges?.map(challenge => <article key={challenge.slug} className="moderation-entry">
      <h3><a href={`/c/${challenge.slug}`}>{challenge.title} ↗</a></h3>
      <p>{challenge.language} · {challenge.moderation === 'pending' ? 'Awaiting review' : challenge.moderation === 'rejected' ? 'Not approved' : 'Approved for sharing'}</p>
      {challenge.review_note && <p>Review note: {challenge.review_note}</p>}
      <label>Visibility for {challenge.title}<select value={challenge.visibility} disabled={busy === challenge.slug} onChange={event => void changeVisibility(challenge.slug, event.target.value)}>
        <option value="public">In the public library</option><option value="unlisted">Anyone with the link</option><option value="hidden">Only me</option>
      </select></label>
    </article>)}
    {challenges?.length === 0 && <p>Your first challenge starts with a passage you enjoy.</p>}
  </section>;
}
