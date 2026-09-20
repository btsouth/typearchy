'use client';
import { useCallback, useEffect, useState } from 'react';
import { loadHistory, subscribeHistory } from '../lib/historyStore';
import { practiceRunsForSync, type PracticeRun } from '../lib/practiceHistory';
import { ACCOUNT_HISTORY_BATCH } from '../lib/accountHistory';

type Kept = { clientId: string; mode: string; target: string; wpm: number; accuracy: number; createdAt: string };

// Keeping practice history on the account is something the player asks for. Nothing uploads on its own,
// and the rows are the aggregate fields only: no prompt, no typed text, no keystrokes.
export default function AccountHistory() {
  const [local, setLocal] = useState<PracticeRun[] | null>(null);
  const [kept, setKept] = useState<Kept[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadKept = useCallback(async (next?: string) => {
    try {
      const response = await fetch('/api/account/history' + (next ? `?cursor=${encodeURIComponent(next)}` : ''));
      const data = await response.json() as { runs?: Kept[]; nextCursor?: string | null; error?: string };
      if (response.status === 401) { setConnected(false); setKept([]); return; }
      if (!response.ok) throw new Error(data.error || 'Could not load the history kept on your account');
      setConnected(true);
      setKept((current) => next ? [...(current || []), ...(data.runs || []).filter((row) => !(current || []).some((old) => old.clientId === row.clientId))] : (data.runs || []));
      setCursor(data.nextCursor || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the history kept on your account');
    }
  }, []);

  const refreshLocal = useCallback(async () => {
    try { setLocal(await loadHistory()); } catch { setLocal([]); }
  }, []);

  useEffect(() => {
    // The two reads settle before updating component state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshLocal();
    void loadKept();
    return subscribeHistory(() => void refreshLocal());
  }, [loadKept, refreshLocal]);

  async function sync() {
    const runs = local || [];
    if (!runs.length) { setNotice('There is nothing on this device to keep yet.'); return; }
    setBusy(`0 of ${runs.length}`); setError(''); setNotice('');
    try {
      const rows = practiceRunsForSync(runs);
      let added = 0;
      for (let index = 0; index < rows.length; index += ACCOUNT_HISTORY_BATCH) {
        const batch = rows.slice(index, index + ACCOUNT_HISTORY_BATCH);
        const response = await fetch('/api/account/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runs: batch }) });
        const data = await response.json() as { added?: number; error?: string };
        if (response.status === 401) { setConnected(false); throw new Error('Connect a profile to keep history on your account'); }
        if (!response.ok) throw new Error(data.error || 'Could not keep this history on your account');
        added += data.added || 0;
        setBusy(`${Math.min(index + ACCOUNT_HISTORY_BATCH, rows.length)} of ${rows.length}`);
      }
      setNotice(added === 0
        ? `Nothing new: your account already has all ${rows.length} of these runs.`
        : `Kept ${added} ${added === 1 ? 'run' : 'runs'} on your account. The newest 500 are kept there, and this device keeps all of them.`);
      setCursor(null);
      await loadKept();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not keep this history on your account. Your local history is unchanged.');
    } finally {
      setBusy('');
    }
  }

  return <section className="my-challenges account-history">
    <h2>Kept on your account</h2>
    <p>Practice stays on this device until you ask. Keeping it here copies the scores, not the typing: no
      prompts, no keystrokes. The newest 500 runs are kept, and this device keeps all of them.</p>
    {!connected ? <p>Connect a profile in <a href="/account">your account</a> to keep practice history here.</p> : <>
      <div className="history-management">
        <button type="button" disabled={busy !== '' || !local?.length} onClick={() => void sync()}>{busy ? `Keeping ${busy}…` : 'Keep this device’s history'}</button>
        {local?.length ? <span>{local.length} {local.length === 1 ? 'run' : 'runs'} on this device</span> : null}
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && <div className="competition-error" role="alert"><p>{error}</p><button type="button" onClick={() => { setError(''); void loadKept(); }}>Retry</button><a href="/account">Open profile</a></div>}
      {kept === null && <p>Loading what your account keeps…</p>}
      {kept?.length === 0 && <p>Your account is not keeping any practice history yet.</p>}
      {kept?.length ? <ul className="account-history-list">{kept.map((run) => <li key={run.clientId}><span>{run.target || run.mode}</span><span>{run.wpm} WPM</span><span>{run.accuracy}%</span><time dateTime={run.createdAt}>{new Date(run.createdAt).toLocaleDateString()}</time></li>)}</ul> : null}
      {cursor && <button type="button" onClick={() => void loadKept(cursor)}>Load older runs</button>}
    </>}
  </section>;
}
