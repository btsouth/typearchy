'use client';

import { useEffect, useState } from 'react';
import MyChallenges from './MyChallenges';
import MyAttempts from './MyAttempts';
import AccountSettings from './AccountSettings';

export default function BrowserAccount({ recovering = false }: { recovering?: boolean }) {
  const [handle, setHandle] = useState(''); const [connected, setConnected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState(''); const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [oldRecovery, setOldRecovery] = useState('');
  useEffect(() => { let active = true; fetch('/api/session').then(async response => await response.json() as { handle: string | null }).then(data => {
    if (active) setConnected(data.handle);
  }).catch(() => { if (active) setError('Could not load your profile. Reload to try again.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function register(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle, action: recovering ? 'recover' : 'create', recoveryCode: oldRecovery }) });
      const data = await response.json() as { handle: string; recoveryCode: string; error?: string }; if (!response.ok) throw new Error(data.error || 'Could not create profile');
      setConnected(data.handle); setRecoveryCode(data.recoveryCode);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create profile'); } finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true); setError('');
    try { const response = await fetch('/api/session', { method: 'DELETE' }); if (!response.ok) throw new Error('Could not sign out'); setConnected(null); setRecoveryCode(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign out'); } finally { setBusy(false); }
  }
  if (loading) return <p role="status">Loading your profile…</p>;
  return <div className="competition-account"><p className="challenge-kicker">YOUR TYPEARCHY</p><h1>{connected ? `@${connected}` : recovering ? 'Welcome back.' : 'Make it yours.'}</h1>
    {connected ? <><p>Your published challenges and results belong to this profile. Practice stays private.</p>
      {recoveryCode && <div className="competition-recovery"><h2>Save your recovery code.</h2><p>This code restores access if you lose this browser. It is shown only here. Keep it private.</p><code>{recoveryCode}</code>
        <label className="competition-check"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} />I saved my recovery code</label></div>}
      {(!recoveryCode || saved) && <div className="competition-actions"><a className="competition-button primary" href="/challenges">Find a challenge</a><a className="competition-button" href={`/u/${connected}`}>Public profile</a><button className="competition-button" onClick={signOut} disabled={busy}>Sign out</button></div>}
      {(!recoveryCode || saved) && <><MyChallenges /><MyAttempts /><AccountSettings /></>}
    </> : <form onSubmit={register}><p>{recovering ? 'Recovery signs out previous devices and gives you a replacement recovery code.' : 'Claim a handle to publish challenges and keep your place in the standings.'}</p><label htmlFor="account-handle">Public handle</label><input id="account-handle" value={handle} onChange={event => setHandle(event.target.value.toLowerCase())} autoComplete="username" autoCapitalize="none" pattern="[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]" minLength={3} maxLength={20} required />
      {recovering && <><label htmlFor="account-recovery">Recovery code</label><input id="account-recovery" type="password" autoComplete="off" value={oldRecovery} onChange={event => setOldRecovery(event.target.value)} required /></>}
      <button className="competition-button primary" disabled={busy}>{busy ? 'Connecting…' : recovering ? 'Recover profile' : 'Create profile'}</button><p>{recovering ? <a href="/account">Create a new profile</a> : <>Already have a profile? On Omarchy, open History and choose <strong>Browser</strong> to connect this browser without a recovery code. Otherwise, <a href="/recover">recover access</a>.</>}</p></form>}
    {error && <p className="competition-error" role="alert">{error}</p>}
  </div>;
}
