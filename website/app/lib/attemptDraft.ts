import type { AttemptEvent } from './challengeContract.ts';
import type { competitionResult } from '../competitionEngine';

export type AttemptSession = { id: string; token: string; expiresAt: number; contentHash: string };
export type AttemptDraft = {
  session: AttemptSession; score: ReturnType<typeof competitionResult>;
  events: AttemptEvent[]; saved: boolean; published: string | null; updatedAt: number;
};

// Per-tab recovery, never a public store. Raw input is removed as soon as the
// server acknowledges it. Closing the tab clears this recovery copy.
export function tabStorage(): Storage | null {
  try { return window.sessionStorage; } catch { return null; }
}

export function readAttemptDraft(storage: Pick<Storage, 'getItem' | 'removeItem'> | null, slug: string, hash: string): AttemptDraft | null {
  if (!storage) return null;
  const key = `typearchy.attempt.${slug}`;
  try {
    const value = JSON.parse(storage.getItem(key) || 'null') as AttemptDraft | null;
    if (!value) return null;
    if (value.session?.contentHash !== hash || !Number.isFinite(value.score?.durationMs)
      || !Array.isArray(value.events) || value.events.length > 24000
      || !/^[a-f0-9]{64}$/.test(value.session.token) || typeof value.saved !== 'boolean'
      || typeof value.updatedAt !== 'number' || Date.now() - value.updatedAt > 86_400_000) {
      storage.removeItem(key); return null;
    }
    if (value.published && !/^https:\/\/typearchy\.com\/a\/[a-z0-9]{12}$/.test(value.published)) value.published = null;
    return value;
  } catch { return null; }
}

export function writeAttemptDraft(storage: Pick<Storage, 'setItem'> | null, slug: string, draft: AttemptDraft) {
  if (!storage) return false;
  try { storage.setItem(`typearchy.attempt.${slug}`, JSON.stringify({ ...draft, events: draft.saved ? [] : draft.events })); return true; }
  catch { return false; }
}
