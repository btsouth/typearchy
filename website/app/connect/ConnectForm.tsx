'use client';

import { useState } from 'react';

export default function ConnectForm({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode); const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [connected, setConnected] = useState<{ handle: string; recoveryCode: string; profileUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const response = await fetch('/api/connect/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, handle }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not connect profile'); setConnected(data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not connect profile'); } finally { setBusy(false); }
  };
  if (connected) return <section className="connect-card connect-success"><p className="section-tag">PROFILE CONNECTED</p><h1>@{connected.handle}</h1><p>The app will detect this connection automatically. Save this recovery code now. It is shown once and can reconnect your profile if this device is lost.</p><div className="recovery-code">{connected.recoveryCode}</div><div className="connect-actions"><button type="button" onClick={async () => { await navigator.clipboard.writeText(connected.recoveryCode); setCopied(true); }}>{copied ? 'COPIED' : 'COPY RECOVERY CODE'}</button><a href={connected.profileUrl}>OPEN PROFILE</a></div></section>;
  return <form className="connect-card" onSubmit={submit}><p className="section-tag">CONNECT TYPEARCHY</p><h1>CLAIM A HANDLE.</h1><p>This connects the Omarchy app that opened this page. It does not upload local history. Runs appear only when you publish them.</p><label>CONNECTION CODE<input autoCapitalize="characters" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={9} required /></label><label>PUBLIC HANDLE<div className="handle-input"><span>typearchy.com/u/</span><input autoCapitalize="none" autoComplete="username" value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase())} minLength={3} maxLength={20} pattern="[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]" required /></div></label>{error && <div className="connect-error" role="alert">{error}</div>}<button className="primary-action" type="submit" disabled={busy}>{busy ? 'CONNECTING...' : 'CONNECT PROFILE'}</button><small>NO PASSWORD / NO EMAIL / NO AUTOMATIC UPLOADS</small></form>;
}
