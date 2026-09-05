'use client';

import { useState } from 'react';

export default function ConnectBrowser() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function generate() {
    setBusy(true); setError(''); setCode('');
    try {
      const response = await fetch('/api/session/grant', { method: 'POST' });
      const data = await response.json() as { code?: string; error?: string };
      if (!response.ok || !data.code) throw new Error(data.error || 'Could not create a connection code.');
      setCode(data.code);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not connect. Try again.'); }
    finally { setBusy(false); }
  }
  return <details className="account-settings"><summary>Connect another browser</summary>
    <p>Use your profile on another computer or browser without signing out anywhere else.</p>
    {code && <div className="competition-recovery"><code>{code}</code><p>In the other browser, open Profile, choose Use an existing profile, and enter this code. It works once and expires in ten minutes. Keep it private.</p></div>}
    <button type="button" className="competition-button" disabled={busy} onClick={generate}>{busy ? 'Creating code…' : code ? 'Get a new code' : 'Get connection code'}</button>
    {error && <p role="alert">{error}</p>}
  </details>;
}
