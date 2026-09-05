'use client';

import { useEffect, useState, type ReactNode } from 'react';

export default function ExistingProfileLink({ code, children }: { code: string; children: ReactNode }) {
  const [handle, setHandle] = useState<string | null | undefined>(undefined); const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { let active = true; fetch('/api/session').then(async response => await response.json() as { handle: string | null }).then(data => { if (active) setHandle(data.handle); }).catch(() => { if (active) setHandle(null); }); return () => { active = false; }; }, []);
  if (handle === undefined) return <p role="status">Loading your profile…</p>;
  if (!handle || !code) return children;
  async function link() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/session/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const data = await response.json() as { error?: string }; if (!response.ok) throw new Error(data.error || 'Could not connect this device');
      setDone(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not connect'); } finally { setBusy(false); }
  }
  return <section className="connect-card"><p className="section-tag">YOUR EXISTING PROFILE</p><h2>@{handle}</h2><p>{done ? 'Device connected. Return to Typearchy on that device.' : `Connect the device showing ${code} to your profile. Only continue if you started this connection.`}</p>
    {!done && <button className="primary-action" onClick={link} disabled={busy}>{busy ? 'CONNECTING…' : 'CONNECT THIS DEVICE'}</button>}{error && <p role="alert">{error}</p>}</section>;
}
