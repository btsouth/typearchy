'use client';
import { useState } from 'react';

export type ProfileEntry = { id?: string; handle: string; reason?: string; detail?: string; suspended: number; moderation_note?: string };
export default function ProfileReview({ entry, onReviewed }: { entry: ProfileEntry; onReviewed: () => void }) {
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function review(action: 'suspend' | 'restore' | 'dismiss') {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/moderation', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: entry.handle, action, note }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not review this profile');
      onReviewed();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not review this profile'); }
    finally { setBusy(false); }
  }
  return <article className="moderation-entry"><header><h3>@{entry.handle}</h3><span>{entry.suspended ? 'Restricted profile' : 'Reported profile'}</span></header>
    {entry.reason && <p><strong>{entry.reason}:</strong> {entry.detail || 'No additional details.'}</p>}
    {entry.moderation_note && <p>Previous note: {entry.moderation_note}</p>}
    <p>Restricting hides this profile and all its public challenges and results. Restoring keeps the profile private until the player chooses to publish it again.</p>
    <label>Review note<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={400} rows={2} /></label>
    {error && <p role="alert">{error}</p>}<div className="competition-actions">
      <button className="competition-button" disabled={busy || !note.trim()} onClick={() => void review(entry.suspended ? 'restore' : 'suspend')}>{entry.suspended ? 'Restore access' : 'Restrict profile'}</button>
      {entry.id && <button className="competition-button" disabled={busy || !note.trim()} onClick={() => void review('dismiss')}>Dismiss report</button>}
    </div>
  </article>;
}
