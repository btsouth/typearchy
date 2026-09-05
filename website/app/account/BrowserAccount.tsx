'use client';

import { useEffect, useRef, useState } from 'react';
import MyChallenges from './MyChallenges';
import MyAttempts from './MyAttempts';
import AccountSettings from './AccountSettings';
import ConnectBrowser from './ConnectBrowser';

export default function BrowserAccount({ recovering = false, onReady, readyLabel = 'Back to my result' }: { recovering?: boolean; onReady?: () => void; readyLabel?: string }) {
  const [handle, setHandle] = useState(''); const [connected, setConnected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState(''); const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [oldRecovery, setOldRecovery] = useState('');
  const [connectionCode, setConnectionCode] = useState('');
  const sessionRevision = useRef(0);
  const actionRunning = useRef(false);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (actionRunning.current) return;
      const revision = sessionRevision.current;
      try {
        const response = await fetch('/api/session');
        const data = await response.json() as { handle: string | null; error?: string };
        if (!response.ok) throw new Error(data.error || 'Could not load your profile.');
        if (active && revision === sessionRevision.current) { setConnected(data.handle); setError(''); }
      } catch { if (active && revision === sessionRevision.current) setError('Could not load your profile. Check your connection and try again.'); }
      finally { if (active) setLoading(false); }
    };
    void refresh();
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, []);
  async function register(event: React.FormEvent) {
    event.preventDefault(); actionRunning.current = true; sessionRevision.current += 1; setBusy(true); setError('');
    try {
      const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle, action: recovering ? 'recover' : 'create', recoveryCode: oldRecovery }) });
      const data = await response.json() as { handle: string; recoveryCode: string; error?: string }; if (!response.ok) throw new Error(data.error || 'Could not create profile');
      setConnected(data.handle); setRecoveryCode(data.recoveryCode); setSaved(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create profile'); } finally { actionRunning.current = false; setBusy(false); }
  }
  async function connectExisting(event: React.FormEvent) {
    event.preventDefault(); actionRunning.current = true; sessionRevision.current += 1; setBusy(true); setError('');
    try {
      const response = await fetch('/api/session/adopt', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({code:connectionCode}) });
      const data = await response.json() as {handle:string;error?:string};
      if (!response.ok) throw new Error(data.error || 'Could not connect. Get a new code and try again.');
      setConnected(data.handle); setRecoveryCode(''); setConnectionCode('');
    } catch(cause) { setError(cause instanceof Error ? cause.message : 'Could not connect.'); }
    finally { actionRunning.current = false; setBusy(false); }
  }
  async function signOut() {
    actionRunning.current = true; sessionRevision.current += 1; setBusy(true); setError('');
    try { const response = await fetch('/api/session', { method: 'DELETE' }); if (!response.ok) throw new Error('Could not sign out'); setConnected(null); setRecoveryCode(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign out'); } finally { actionRunning.current = false; setBusy(false); }
  }
  if (loading) return <p role="status">Loading your profile…</p>;
  return <div className="competition-account"><p className="challenge-kicker">YOUR TYPEARCHY</p><h1>{connected ? `@${connected}` : recovering ? 'Welcome back.' : 'Create your profile.'}</h1>
    {connected ? <><p>Use this profile in the app and browser. Shared results belong to it; practice history stays on each device.</p>
      {recoveryCode && <div className="competition-recovery"><h2>Save your recovery code.</h2><p>Use this only if you lose access to all connected devices. Save it somewhere private.</p><code>{recoveryCode}</code>
        <label className="competition-check"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} />I saved my recovery code</label></div>}
      {(!recoveryCode || saved) && onReady && <button className="competition-button primary" type="button" onClick={onReady}>{readyLabel}</button>}
      {(!recoveryCode || saved) && !onReady && <div className="competition-actions"><a className="competition-button primary" href="/challenges">Find a challenge</a><a className="competition-button" href={`/u/${connected}`}>Public profile</a><button className="competition-button" onClick={signOut} disabled={busy}>Sign out</button></div>}
      {(!recoveryCode || saved) && !onReady && <><p><a href="/history">View your history and progress</a></p><ConnectBrowser /><MyChallenges /><MyAttempts /><AccountSettings /></>}
    </> : <form onSubmit={register}><p>{recovering ? 'Recovery signs out previous devices and gives you a replacement recovery code.' : 'Choose a name for your shared results. No email or password needed. You can keep practicing without a profile.'}</p><label htmlFor="account-handle">Public handle</label><input id="account-handle" value={handle} onChange={event => setHandle(event.target.value.toLowerCase())} autoComplete="username" autoCapitalize="none" pattern="[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]" minLength={3} maxLength={20} required />
      {recovering && <><label htmlFor="account-recovery">Recovery code</label><input id="account-recovery" type="password" autoComplete="off" value={oldRecovery} onChange={event => setOldRecovery(event.target.value)} required /></>}
      <button className="competition-button primary" disabled={busy}>{busy ? 'Connecting…' : recovering ? 'Recover profile' : 'Create profile'}</button><p>{recovering ? <a href="/account">Create a new profile</a> : <>Already have a profile? Use a connection code below. If you lost access to every device, <a href="/recover" target={onReady ? "_blank" : undefined} rel="noopener">use your recovery code</a>.</>}</p></form>}
    {!connected && !recovering && <details className="account-settings"><summary>Use an existing profile</summary>
      <p>In a connected browser, open Profile and choose Connect another browser to get a code. In the desktop app, choose Account in browser from History.</p>
      <form onSubmit={connectExisting}><label htmlFor="browser-connection-code">Connection code</label><input id="browser-connection-code" autoComplete="one-time-code" autoCapitalize="characters" value={connectionCode} onChange={event => setConnectionCode(event.target.value.toUpperCase().replace(/\s/g,''))} pattern="[A-HJ-NP-Z2-9]{8}" maxLength={8} required /><button className="competition-button" disabled={busy}>Connect this browser</button></form>
    </details>}
    {error && <p className="competition-error" role="alert">{error}</p>}
  </div>;
}
