import { db, enforceRateLimit, errorResponse, json, randomHex, rateLimitResponse, RateLimitError, readJson, sha256 } from '../../lib/db';
import { constantTimeEqual, validateDeviceLabel, validateHandle } from '../../lib/profileContract';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await readJson(request) as Record<string, unknown>;
    const handle = validateHandle(body.handle);
    await enforceRateLimit(`recover:${handle}`, 6, 3600);
    const recoveryCode = String(body.recoveryCode || '');
    const tokenHash = String(body.tokenHash || '');
    if (!/^[a-f0-9]{64}$/.test(tokenHash)) throw new Error('Invalid recovery request');
    const database = db();
    const profile = await database.prepare(`SELECT id, handle, recovery_hash FROM profiles
      WHERE handle = ? COLLATE NOCASE`).bind(handle)
      .first<{ id: string; handle: string; recovery_hash: string }>();
    if (!profile || !constantTimeEqual(await sha256(recoveryCode), profile.recovery_hash))
      return json({ error: 'Handle or recovery code is incorrect' }, 401);
    const nextRecoveryCode = `tpy_recovery_${randomHex(18)}`;
    const nextRecoveryHash = await sha256(nextRecoveryCode);
    const now = Math.floor(Date.now() / 1000);
    await database.batch([
      database.prepare(`UPDATE devices SET revoked_at = ?
        WHERE profile_id = ? AND revoked_at IS NULL`).bind(now, profile.id),
      database.prepare(`INSERT INTO devices
        (id, profile_id, token_hash, label, created_at, last_used_at)
        VALUES (?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), profile.id, tokenHash, validateDeviceLabel(body.label), now, now),
      database.prepare('UPDATE profiles SET recovery_hash = ?, updated_at = ? WHERE id = ?')
        .bind(nextRecoveryHash, now, profile.id),
    ]);
    return json({ status: 'connected', handle: profile.handle, recoveryCode: nextRecoveryCode, profileUrl: `https://typearchy.com/u/${profile.handle}` }, 201);
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    return errorResponse(error);
  }
}
