import { clientKey, db, enforceRateLimit, errorResponse, json, randomHex, rateLimitResponse, RateLimitError, readJson, sha256 } from '../../../lib/db';
import { validateConnectionCode, validateHandle } from '../../../lib/profileContract';

export const dynamic = 'force-dynamic';

function isHandleCollision(error: unknown) {
  return error instanceof Error && error.message.includes('UNIQUE constraint failed: profiles.handle');
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`claim-ip:${clientKey(request)}`, 20, 3600);
    const body = await readJson(request) as Record<string, unknown>;
    const code = validateConnectionCode(body.code);
    await enforceRateLimit(`claim:${code}`, 8, 900);
    const handle = validateHandle(body.handle);
    const database = db();
    const now = Math.floor(Date.now() / 1000);
    const connection = await database.prepare(`SELECT code, token_hash, label, expires_at, claimed_at
      FROM connections WHERE code = ? AND kind = 'connect'`).bind(code)
      .first<{ code: string; token_hash: string; label: string; expires_at: number; claimed_at: number | null }>();
    if (!connection || connection.expires_at <= now || connection.claimed_at)
      return json({ error: 'Invalid or expired connection code' }, 404);
    const existing = await database.prepare('SELECT id FROM profiles WHERE handle = ? COLLATE NOCASE')
      .bind(handle).first();
    if (existing) return json({ error: 'That handle is already claimed' }, 409);

    const profileId = crypto.randomUUID();
    const deviceId = crypto.randomUUID();
    const recoveryCode = `tpy_recovery_${randomHex(18)}`;
    const recoveryHash = await sha256(recoveryCode);
    try {
      await database.batch([
        database.prepare(`INSERT INTO profiles
          (id, handle, recovery_hash, visibility, created_at, updated_at)
          VALUES (?, ?, ?, 'public', ?, ?)`).bind(profileId, handle, recoveryHash, now, now),
        database.prepare(`INSERT INTO devices
          (id, profile_id, token_hash, label, created_at, last_used_at)
          VALUES (?, ?, ?, ?, ?, ?)`).bind(deviceId, profileId, connection.token_hash, connection.label, now, now),
        database.prepare(`UPDATE connections SET profile_id = ?, claimed_at = ? WHERE code = ?`)
          .bind(profileId, now, code),
      ]);
    } catch (error) {
      if (isHandleCollision(error)) return json({ error: 'That handle is already claimed' }, 409);
      throw error;
    }
    return json({ status: 'connected', handle, recoveryCode, profileUrl: `https://typearchy.com/u/${handle}`, visibility: 'public' }, 201);
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    return errorResponse(error);
  }
}
