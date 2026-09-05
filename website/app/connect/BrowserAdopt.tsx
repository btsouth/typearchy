'use client';

import { useEffect, useState } from 'react';

// Connect this browser to a profile that is already connected on another device.
// The app handed the browser a one-time code; confirming trades it for a session.
export default function BrowserAdopt({ code }: { code: string }) {
  const [handle, setHandle] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/session/grant?code=${encodeURIComponent(code)}`).then(async response => {
      const data = await response.json() as { handle?: string; error?: string };
      if (!active) return;
      if (!response.ok) { setError(data.error || 'This connection code expired.'); setHandle(null); return; }
      setHandle(data.handle || null);
    }).catch(() => { if (active) { setError('Could not reach typearchy.com. Check your connection and reload.'); setHandle(null); } });
    return () => { active = false; };
  }, [code]);
  async function adopt() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/session/adopt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not connect this browser');
      setDone(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not connect this browser'); } finally { setBusy(false); }
  }
  if (handle === undefined) return <section className="connect-card"><p role="status">Checking this connection…</p></section>;
  if (done) return <section className="connect-card connect-success"><p className="section-tag">BROWSER CONNECTED</p><h1>@{handle}</h1><p>This browser now shares your profile. Your recovery code is unchanged and every other device stays connected.</p><div className="connect-actions"><a href="/account">OPEN YOUR ACCOUNT</a><a href="/challenges">FIND A CHALLENGE</a></div></section>;
  if (!handle) return <section className="connect-card"><p className="section-tag">CONNECT THIS BROWSER</p><h1>CODE EXPIRED.</h1><p>{error || 'This connection code is no longer valid.'} Codes last ten minutes. Open Typearchy on your device and choose Browser again.</p></section>;
  return <section className="connect-card"><p className="section-tag">CONNECT THIS BROWSER</p><h1>@{handle}</h1><p>Connect this browser to your profile? Only continue if you started this from Typearchy on your own device. Nothing uploads automatically, and no other device is signed out.</p>
    {error && <div className="connect-error" role="alert">{error}</div>}
    <button className="primary-action" type="button" onClick={adopt} disabled={busy}>{busy ? 'CONNECTING…' : 'CONNECT THIS BROWSER'}</button><small>NO RECOVERY CODE NEEDED / OTHER DEVICES STAY CONNECTED</small></section>;
}
