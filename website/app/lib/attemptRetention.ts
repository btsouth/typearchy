import { db } from './db';

// Bounded opportunistic cleanup, independent of whether a player can submit.
// Expired sessions are rejected by the submission API even before this sweep.
export async function sweepAttempts(now: number) {
  await db().batch([
    db().prepare(`DELETE FROM attempt_sessions WHERE id IN (
      SELECT id FROM attempt_sessions WHERE completed_at IS NULL AND expires_at < ? LIMIT 100)`)
      .bind(now - 86400000),
    db().prepare(`DELETE FROM attempt_sessions WHERE id IN (
      SELECT id FROM challenge_attempts WHERE profile_id IS NULL AND created_at < ? LIMIT 100)`)
      .bind(now - 7 * 86400000),
  ]);
}
