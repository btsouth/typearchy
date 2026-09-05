import { authenticateDevice, clientKey, db, enforceRateLimit, errorResponse, json, randomHex, sha256 } from '../../../../lib/db';
import { sweepAttempts } from '../../../../lib/attemptRetention';
import { findChallenge } from '../../../../lib/challenges';
import { requireSupportedClient } from '../../../../lib/clientVersion';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    requireSupportedClient(request);
    await enforceRateLimit(`attempt-start:${clientKey(request)}`, 120, 3600);
    const identity = await authenticateDevice(request);
    const challenge = await findChallenge((await params).slug, identity?.profileId);
    if (!challenge) return json({ error: 'Challenge not found' }, 404);
    if (Math.random() < 0.02) await sweepAttempts(Date.now());
    const id = crypto.randomUUID();
    const token = randomHex(32);
    const now = Date.now();
    await db().prepare(`INSERT INTO attempt_sessions
      (id, challenge_id, profile_id, token_hash, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(id, challenge.id, identity?.profileId || null, await sha256(token), now, now + 20 * 60_000).run();
    return json({ id, token, expiresAt: now + 20 * 60_000, contentHash: challenge.content_hash }, 201);
  } catch (error) { return errorResponse(error); }
}
