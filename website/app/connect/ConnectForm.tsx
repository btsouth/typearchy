'use client';

import { useState } from 'react';

export default function ConnectForm({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode); const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [connected, setConnected] = useState<{ handle: string; recoveryCode: string; profileUrl: string; browserConnected?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const response = await fetch('/api/connect/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, handle }) }); const data = await response.json() as { error?: string; handle: string; recoveryCode: string; profileUrl: string; browserConnected?: boolean }; if (!response.ok) throw new Error(data.error || 'Could not connect profile'); setConnected(data); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not connect profile'); } finally { setBusy(false); }
  };
  if (connected) return <section className="connect-card connect-success"><p className="section-tag">PROFILE CONNECTED</p><h1>@{connected.handle}</h1><p>{connected.browserConnected ? "Your app and this browser are connected. Return to your result in the app to share it." : "Your app is connected. You can return to your result to share it."} Save your recovery code in case you lose access to every device.</p><div className="recovery-code">{connected.recoveryCode}</div><div className="connect-actions"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(connected.recoveryCode); setCopied(true); } catch { setError("Could not copy. Select the code and copy it manually."); } }}>{copied ? 'COPIED' : 'COPY RECOVERY CODE'}</button><a href="/account">YOUR PROFILE</a></div>{error && <p role="alert">{error}</p>}</section>;
  return <form className="connect-card" onSubmit={submit}><p className="section-tag">CONNECT TYPEARCHY</p><h1>Create your profile.</h1><p>Choose a name for your shared results. This connects your app and this browser. Practice history stays on each device; only results you choose to share are published.</p><label hidden={!!initialCode}>CONNECTION CODE<input autoCapitalize="characters" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={9} required /></label><label>PUBLIC HANDLE<div className="handle-input"><span>typearchy.com/u/</span><input autoCapitalize="none" autoComplete="username" value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase())} minLength={3} maxLength={20} pattern="[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]" required /></div></label>{error && <div className="connect-error" role="alert">{error}</div>}<button className="primary-action" type="submit" disabled={busy}>{busy ? 'CONNECTING...' : 'CREATE PROFILE'}</button><p>Already have a profile? <a href="/account" target="_blank" rel="noopener">Connect this browser</a>, then reload this page to use it in the app.</p><small>No email or password needed. Save your recovery code.</small></form>;
}
