'use client';

import { useEffect, useState } from 'react';
type Account = { suspended: number; moderation_note: string; handle: string; visibility: string; currentDevice: string; devices: { id: string; label: string; last_used_at: number }[] };

export default function AccountSettings() {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [confirmation, setConfirmation] = useState('');
  useEffect(() => { let active = true;
    fetch('/api/account').then(async response => {
      const data = await response.json() as Account & { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not load settings');
      if (active) setAccount(data);
    }).catch(cause => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, []);
  async function change(path: string, method: string, body?: object) {
    setBusy(true); setError('');
    try {
      const response = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
      const data = await response.json() as { error?: string; signedOut?: boolean };
      if (!response.ok) throw new Error(data.error || 'Could not update your account');
      if (method === 'DELETE' || data.signedOut) window.location.reload();
      else { const updated = await fetch('/api/account'); if (updated.ok) setAccount(await updated.json() as Account); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update your account'); }
    finally { setBusy(false); }
  }
  return <details className="account-settings"><summary>Privacy and connected devices</summary>
    {account && <>{!!account.suspended && <p role="status">Your public profile is restricted. {account.moderation_note}</p>}<label>Profile visibility<select value={account.visibility} disabled={busy || !!account.suspended} onChange={event => void change('/api/profile', 'PATCH', { visibility: event.target.value })}>
      <option value="public">Public</option><option value="private">Private</option>
    </select></label><p>A private profile hides your public page, challenges, and results. Your practice stays on your device.</p>
      <h3>Connected devices</h3>{account.devices.map(device => <div className="account-device" key={device.id}><span>{device.label}{device.id === account.currentDevice ? ' (this browser)' : ''}</span>
        <button className="competition-button" disabled={busy} onClick={() => void change('/api/account', 'PATCH', { revokeDevice: device.id })}>Disconnect</button></div>)}
      <details><summary>Delete profile</summary><p>This permanently deletes this profile, device access, shared challenges, and online results. Local practice history stays on each device.</p>
        <label>Type {account.handle} to confirm<input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" /></label>
        <button className="competition-button" disabled={busy || confirmation !== account.handle} onClick={() => void change('/api/profile', 'DELETE')}>Delete my profile permanently</button>
      </details>
    </>}{error && <p className="competition-error" role="alert">{error}</p>}
  </details>;
}
