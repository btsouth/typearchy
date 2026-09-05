'use client';

import { useCallback, useEffect, useState } from 'react';
import ProfileReview, { type ProfileEntry } from './ProfileReview';
type Queue = { challenges: Entry[]; reports: Entry[]; profileReports: ProfileEntry[]; restrictedProfiles: ProfileEntry[] };

type Entry = { slug: string; title: string; passage: string; attribution: string; handle: string; language?: string; id?: string; reason?: string; detail?: string };

function Review({ entry, onReviewed }: { entry: Entry; onReviewed: () => void }) {
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function review(status: 'approved' | 'rejected') {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/moderation', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: entry.slug, status, note }) });
      const data = await response.json() as Queue & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Review could not be saved');
      onReviewed();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review could not be saved'); }
    finally { setBusy(false); }
  }
  return <article className="moderation-entry"><header><h3>{entry.title}</h3><span>@{entry.handle} · {entry.language || 'Reported passage'}</span></header>
    {entry.reason && <p><strong>{entry.reason}:</strong> {entry.detail || 'No additional details.'}</p>}
    <pre>{entry.passage}</pre><p>{entry.attribution || 'No attribution supplied'}</p>
    <label>Note to creator<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={400} rows={2} /></label>
    {error && <p role="alert">{error}</p>}<div className="competition-actions">
      <button className="competition-button primary" disabled={busy} onClick={() => review('approved')}>Approve</button>
      <button className="competition-button" disabled={busy || !note.trim()} onClick={() => review('rejected')}>Reject with note</button>
    </div>
  </article>;
}

export default function ModerationQueue() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/moderation', { cache: 'no-store' }); const data = await response.json() as Queue & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not load the queue');
      setQueue(data); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load the queue'); }
  }, []);
  useEffect(() => {
    // Loading remote data only updates state after the request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  return <section className="moderation-queue"><p>Unreviewed passages are already reachable by link. Reports come first: rejecting hides the passage, its results, and its social cards immediately. Approval adds a passage to the public library. Reject explicit content, abuse, spam, exposed personal information, or material without permission to share, and check source credits before approving code excerpts.</p>
    {error && <p role="alert">{error}</p>}{!queue && !error && <p role="status">Loading queue…</p>}
    <button className="competition-button" onClick={() => void load()}>Refresh</button>
    {queue && <><h2>Profile reports ({queue.profileReports.length})</h2>{queue.profileReports.map(entry => <ProfileReview key={entry.id} entry={entry} onReviewed={() => void load()} />)}
      <h2>Restricted profiles ({queue.restrictedProfiles.length})</h2>{queue.restrictedProfiles.map(entry => <ProfileReview key={entry.handle} entry={entry} onReviewed={() => void load()} />)}
      <h2>Reports ({queue.reports.length})</h2>{queue.reports.map(entry => <Review key={entry.id} entry={entry} onReviewed={() => void load()} />)}
      <h2>Awaiting library review ({queue.challenges.length})</h2>{queue.challenges.map(entry => <Review key={entry.slug} entry={entry} onReviewed={() => void load()} />)}
      {!queue.challenges.length && !queue.reports.length && !queue.profileReports.length && <p>The queue is clear.</p>}</>}
  </section>;
}
