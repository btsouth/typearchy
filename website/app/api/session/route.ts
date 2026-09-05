import { authenticateDevice, clientKey, db, enforceRateLimit, errorResponse, json, randomHex, readJson, sha256 } from '../../lib/db';
import { constantTimeEqual, validateHandle } from '../../lib/profileContract';
import { ClientError } from '../../lib/clientError';

export const dynamic = 'force-dynamic';

function sessionCookie(request: Request, token: string, maxAge = 60 * 60 * 24 * 90) {
  return `typearchy_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}

export async function GET(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    return json(identity ? { handle: identity.handle } : { handle: null });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new ClientError('Request origin does not match', 403);
    if (await authenticateDevice(request)) throw new ClientError('Sign out before creating another profile', 409);
    await enforceRateLimit(`browser-register:${clientKey(request)}`, 6, 3600);
    const body = await readJson(request) as Record<string, unknown>;
    const handle = validateHandle(body.handle);
    const token = `tpy_${randomHex(32)}`;
    const recoveryCode = `tpy_recovery_${randomHex(18)}`;
    const now = Math.floor(Date.now() / 1000);
    if (body.action === 'recover') {
      await enforceRateLimit(`browser-recover:${handle}`, 6, 3600);
      const profile = await db().prepare('SELECT id, recovery_hash FROM profiles WHERE handle = ? COLLATE NOCASE')
        .bind(handle).first<{ id: string; recovery_hash: string }>();
      const supplied = await sha256(String(body.recoveryCode || ''));
      if (!profile || !constantTimeEqual(supplied, profile.recovery_hash)) throw new ClientError('Handle or recovery code is incorrect', 401);
      const nextHash = await sha256(recoveryCode);
      const results = await db().batch([
        db().prepare('UPDATE profiles SET recovery_hash = ?, updated_at = ? WHERE id = ? AND recovery_hash = ?')
          .bind(nextHash, now, profile.id, supplied),
        db().prepare(`UPDATE devices SET revoked_at = ? WHERE profile_id =
          (SELECT id FROM profiles WHERE id = ? AND recovery_hash = ?) AND revoked_at IS NULL`)
          .bind(now, profile.id, nextHash),
        db().prepare(`INSERT INTO devices (id, profile_id, token_hash, label, created_at, last_used_at)
          SELECT ?, id, ?, 'Recovered browser', ?, ? FROM profiles WHERE id = ? AND recovery_hash = ?`)
          .bind(crypto.randomUUID(), await sha256(token), now, now, profile.id, nextHash),
      ]);
      if (results[0].meta.changes !== 1) throw new ClientError('Recovery was already completed. Use the replacement recovery code.', 409);
      return json({ handle, recoveryCode }, 200, { 'Set-Cookie': sessionCookie(request, token) });
    }
    const profileId = crypto.randomUUID();
    try {
      await db().batch([
        db().prepare(`INSERT INTO profiles (id, handle, recovery_hash, visibility, created_at, updated_at)
          VALUES (?, ?, ?, 'public', ?, ?)`).bind(profileId, handle, await sha256(recoveryCode), now, now),
        db().prepare(`INSERT INTO devices (id, profile_id, token_hash, label, created_at, last_used_at)
          VALUES (?, ?, ?, 'Web browser', ?, ?)`).bind(crypto.randomUUID(), profileId, await sha256(token), now, now),
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed: profiles.handle'))
        throw new ClientError('That handle is already claimed', 409);
      throw error;
    }
    return json({ handle, recoveryCode }, 201, { 'Set-Cookie': sessionCookie(request, token) });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (identity) await db().prepare('UPDATE devices SET revoked_at = ? WHERE id = ?')
      .bind(Math.floor(Date.now() / 1000), identity.deviceId).run();
    return json({ handle: null }, 200, { 'Set-Cookie': sessionCookie(request, '', 0) });
  } catch (error) { return errorResponse(error); }
}
