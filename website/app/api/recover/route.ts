import { clientKey, db, enforceRateLimit, errorResponse, json, randomHex, rateLimitResponse, RateLimitError, readJson, sha256 } from '../../lib/db';
import { ClientError } from '../../lib/clientError';
import { constantTimeEqual, validateConnectionCode, validateDeviceLabel, validateHandle } from '../../lib/profileContract';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`recover-ip:${clientKey(request)}`, 12, 3600);
    const body = await readJson(request) as Record<string, unknown>;
    const handle = validateHandle(body.handle);
    await enforceRateLimit(`recover:${handle}`, 6, 3600);
    const recoveryCode = String(body.recoveryCode || '');
    const database = db();
    const now = Math.floor(Date.now() / 1000);
    let tokenHash = '';

    if (body.code !== undefined && body.code !== null && String(body.code) !== '') {
      const code = validateConnectionCode(body.code);
      const connection = await database.prepare(`SELECT token_hash FROM connections
        WHERE code = ? AND kind = 'recover' AND claimed_at IS NULL AND expires_at > ?`)
        .bind(code, now).first<{ token_hash: string }>();
      if (!connection) throw new ClientError('Recovery session expired. Start recovery in the app again.');
      await database.prepare('UPDATE connections SET claimed_at = ? WHERE code = ?').bind(now, code).run();
      tokenHash = connection.token_hash;
    } else {
      tokenHash = String(body.tokenHash || '');
      if (!/^[a-f0-9]{64}$/.test(tokenHash)) throw new ClientError('Invalid recovery request');
    }

    const profile = await database.prepare(`SELECT id, handle, visibility, recovery_hash FROM profiles
      WHERE handle = ? COLLATE NOCASE`).bind(handle)
      .first<{ id: string; handle: string; visibility: 'public' | 'private'; recovery_hash: string }>();
    if (!profile || !constantTimeEqual(await sha256(recoveryCode), profile.recovery_hash))
      return json({ error: 'Handle or recovery code is incorrect' }, 401);
    const nextRecoveryCode = `tpy_recovery_${randomHex(18)}`;
    const nextRecoveryHash = await sha256(nextRecoveryCode);
    await database.batch([
      database.prepare(`UPDATE devices SET revoked_at = ?
        WHERE profile_id = ? AND revoked_at IS NULL`).bind(now, profile.id),
      database.prepare(`INSERT INTO devices
        (id, profile_id, token_hash, label, created_at, last_used_at)
        VALUES (?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), profile.id, tokenHash, validateDeviceLabel(body.label), now, now),
      database.prepare('UPDATE profiles SET recovery_hash = ?, updated_at = ? WHERE id = ?')
        .bind(nextRecoveryHash, now, profile.id),
    ]);
    return json({ status: 'connected', handle: profile.handle, recoveryCode: nextRecoveryCode, profileUrl: `https://typearchy.com/u/${profile.handle}`, visibility: profile.visibility }, 201);
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    return errorResponse(error);
  }
}
