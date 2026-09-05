'use client';

import { useState } from 'react';

export default function ReportChallenge({ slug, profile }: { slug?: string; profile?: string }) {
  const subject = profile ? 'profile' : 'passage';
  const [reason, setReason] = useState('vulgar');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(profile ? `/api/profiles/${encodeURIComponent(profile)}/report` : `/api/challenges/${slug}/report`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, detail }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not send your report');
      setSent(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send your report'); }
    finally { setBusy(false); }
  }
  return <details className="challenge-report"><summary>Report this {subject}</summary>
    {sent ? <p role="status">Report received. A moderator will review this {subject}.</p> : <form onSubmit={submit}>
      <label>Reason<select value={reason} onChange={event => setReason(event.target.value)}>
        <option value="vulgar">Vulgar or explicit content</option><option value="hateful">Hateful or abusive content</option>
        <option value="spam">Spam or advertising</option>{profile ? <option value="impersonation">Impersonation</option> : <option value="rights">Copyright or attribution</option>}<option value="other">Something else</option>
      </select></label>
      <label>Details (optional)<textarea value={detail} maxLength={1000} rows={3} onChange={event => setDetail(event.target.value)} /></label>
      {error && <p role="alert">{error}</p>}<button className="competition-button" disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button>
    </form>}
  </details>;
}
