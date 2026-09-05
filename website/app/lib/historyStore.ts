import { normalizePracticeHistory, type PracticeRun } from './practiceHistory';

export class HistoryRecoveryError extends Error {}
const LEGACY = 'typearchy.web.runs.v1';
const listeners = new Set<() => void>();
let database: Promise<IDBDatabase> | undefined;
let channel: BroadcastChannel | undefined;
function changed() { listeners.forEach(listener => listener()); }
function announce() { changed(); channel?.postMessage('changed'); }
function open(): Promise<IDBDatabase> {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('typearchy-history', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('runs', { keyPath: 'id' });
      request.result.createObjectStore('metadata');
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close older Typearchy tabs and try again.'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); database = undefined; };
      resolve(db);
    };
  }).catch(error => { database = undefined; throw error; });
  return database;
}
async function migrate() {
  const db = await open();
  // Keep the original backup untouched. A marker prevents clear from resurrecting it.
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['runs', 'metadata'], 'readwrite');
    let failure: Error | undefined;
    const marker = tx.objectStore('metadata').get('legacy-migrated');
    marker.onsuccess = () => {
      if (marker.result) return;
      try {
        const raw = localStorage.getItem(LEGACY);
        if (raw) {
          const input = JSON.parse(raw);
          const runs = normalizePracticeHistory(input);
          if (!Array.isArray(input) || runs.length !== input.length) throw new HistoryRecoveryError('Your previous history needs recovery. Its original backup has been preserved.');
          runs.forEach(run => tx.objectStore('runs').put(run));
        }
        tx.objectStore('metadata').put(true, 'legacy-migrated');
      } catch (error) { failure = error instanceof SyntaxError ? new HistoryRecoveryError('Your previous history could not be read. Its original backup has been preserved.') : error instanceof Error ? error : new Error('History migration failed'); tx.abort(); }
    };
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(failure || tx.error || new Error('Could not load history'));
  });
}
export async function loadHistory(): Promise<PracticeRun[]> {
  await migrate();
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('runs', 'readonly');
    const request = tx.objectStore('runs').getAll();
    tx.oncomplete = () => resolve(normalizePracticeHistory(request.result));
    tx.onabort = tx.onerror = () => reject(tx.error || new Error('Could not read history'));
  });
}
export async function saveHistoryRuns(runs: PracticeRun[], overwrite = true) {
  let recovering = false;
  try { await migrate(); } catch(error) { if(!overwrite && error instanceof HistoryRecoveryError) recovering = true; else throw error; }
  const normalized = normalizePracticeHistory(runs);
  if (normalized.length !== runs.length) throw new Error('Invalid or duplicate runs. Nothing was saved.');
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['runs','metadata'], 'readwrite');
    if (recovering) tx.objectStore('metadata').put(true,'legacy-migrated');
    const store = tx.objectStore('runs');
    if (!overwrite) {
      const all = store.getAll();
      all.onsuccess = () => {
        const ids = new Set(all.result.map((run: PracticeRun) => run.id));
        const identities = new Set(all.result.map((run: PracticeRun) => `${run.timestamp}|${run.challengeKey}`));
        for (const run of normalized) {
          const identity = `${run.timestamp}|${run.challengeKey}`;
          if (!ids.has(run.id) && !identities.has(identity)) { store.put(run); ids.add(run.id); identities.add(identity); }
        }
      };
    } else for (const run of normalized) {
      const existing = store.get(run.id);
      existing.onsuccess = () => { store.put({ ...existing.result, ...run }); };
    }
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error || new Error('Could not save history'));
  });
  announce();
}
export async function clearHistory() {
  await migrate();
  // Explicit clearing removes the migration backup too. If this fails, keep the archive.
  localStorage.removeItem(LEGACY);
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('runs', 'readwrite'); tx.objectStore('runs').clear();
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () => reject(tx.error || new Error('Could not clear history'));
  });
  announce();
}
export function subscribeHistory(listener: () => void) {
  listeners.add(listener);
  if (!channel && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('typearchy-history'); channel.onmessage = changed;
  }
  return () => { listeners.delete(listener); if (!listeners.size) { channel?.close(); channel = undefined; } };
}
