'use client';

import { useEffect, useState } from 'react';
type Account = { suspended: number; moderation_note: string; recovery_rotated_at: number | null; handle: string; visibility: string; currentDevice: string; devices: { id: string; label: string; created_at: number; last_used_at: number }[] };

function when(seconds: number) { return new Date(seconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }

export default function AccountSettings() {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [confirmation, setConfirmation] = useState('');
  const [newRecovery, setNewRecovery] = useState(''); const [copied, setCopied] = useState(false); const [armRotate, setArmRotate] = useState(false);
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
  async function rotateRecovery() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/account/recovery-code', { method: 'POST' });
      const data = await response.json() as { recoveryCode?: string; error?: string };
      if (!response.ok || !data.recoveryCode) throw new Error(data.error || 'Could not replace the recovery code');
      setNewRecovery(data.recoveryCode); setArmRotate(false); setCopied(false);
      const updated = await fetch('/api/account'); if (updated.ok) setAccount(await updated.json() as Account);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not replace the recovery code'); }
    finally { setBusy(false); }
  }
  return <details className="account-settings"><summary>Privacy, devices, and recovery</summary>
    {account && <>{!!account.suspended && <p role="status">Your public profile is restricted. {account.moderation_note}</p>}<label>Profile visibility<select value={account.visibility} disabled={busy || !!account.suspended} onChange={event => void change('/api/profile', 'PATCH', { visibility: event.target.value })}>
      <option value="public">Public</option><option value="private">Private</option>
    </select></label><p>A private profile hides your public page, challenges, and results. Your practice stays on your device.</p>
      <h3>Connected devices</h3><p>Every device that can publish as @{account.handle}. Disconnecting a device signs it out; it can reconnect from the app.</p>
      {account.devices.map(device => <div className="account-device" key={device.id}><span>{device.label}{device.id === account.currentDevice ? ' (this browser)' : ''}<small>Connected {when(device.created_at)} · last used {when(device.last_used_at)}</small></span>
        <button className="competition-button" disabled={busy} onClick={() => void change('/api/account', 'PATCH', { revokeDevice: device.id })}>{device.id === account.currentDevice ? 'Sign out' : 'Disconnect'}</button></div>)}
      <p className="competition-note">To add a device: open Typearchy on Omarchy, choose Create / Connect in History, and confirm here while signed in. To add a browser from the app, choose Browser in History.</p>
      <h3>Recovery code</h3>
      <p>{account.recovery_rotated_at ? `Replaced ${when(account.recovery_rotated_at)}.` : 'Created with your profile.'} The recovery code restores access when every device is lost. Replacing it keeps all current devices connected and stops the old code from working.</p>
      {newRecovery ? <div className="competition-recovery"><h2>Your new recovery code.</h2><p>Shown once. Save it somewhere safe now.</p><code>{newRecovery}</code>
        <div className="competition-actions"><button className="competition-button" type="button" onClick={async () => { try { await navigator.clipboard.writeText(newRecovery); setCopied(true); } catch { setError('Select the code and copy it by hand.'); } }}>{copied ? 'Copied' : 'Copy recovery code'}</button><button className="competition-button" type="button" onClick={() => setNewRecovery('')}>I saved it</button></div></div>
        : armRotate ? <div className="competition-actions"><button className="competition-button primary" disabled={busy} onClick={() => void rotateRecovery()}>Replace it now</button><button className="competition-button" disabled={busy} onClick={() => setArmRotate(false)}>Keep the current code</button></div>
        : <button className="competition-button" disabled={busy} onClick={() => setArmRotate(true)}>Replace recovery code</button>}
      <details><summary>Delete profile</summary><p>This permanently deletes this profile, device access, shared challenges, and online results. Local practice history stays on each device.</p>
        <label>Type {account.handle} to confirm<input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" /></label>
        <button className="competition-button" disabled={busy || confirmation !== account.handle} onClick={() => void change('/api/profile', 'DELETE')}>Delete my profile permanently</button>
      </details>
    </>}{error && <p className="competition-error" role="alert">{error}</p>}
  </details>;
}
