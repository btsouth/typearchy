import { authenticateDevice, clientKey, db, enforceRateLimit, errorResponse, json, randomHex, readJson, sha256 } from '../../../lib/db';
import { ClientError } from '../../../lib/clientError';
import { validateConnectionCode } from '../../../lib/profileContract';

export const dynamic = 'force-dynamic';

function sessionCookie(request: Request, token: string, maxAge = 60 * 60 * 24 * 90) {
  return `typearchy_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}

export async function POST(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new ClientError('Request origin does not match', 403);
    await enforceRateLimit(`browser-adopt:${clientKey(request)}`, 20, 3600);
    const body = await readJson(request) as Record<string, unknown>;
    const code = validateConnectionCode(body.code);
    await enforceRateLimit(`browser-adopt-code:${code}`, 8, 900);
    const database = db();
    const now = Math.floor(Date.now() / 1000);
    const connection = await database.prepare(`SELECT c.profile_id, p.handle FROM connections c JOIN profiles p ON p.id = c.profile_id
      WHERE c.code = ? AND c.kind = 'browser' AND c.claimed_at IS NULL AND c.expires_at > ?`)
      .bind(code, now).first<{ profile_id: string; handle: string }>();
    if (!connection) throw new ClientError('This connection code expired. Start again from the app.', 404);
    const current = await authenticateDevice(request);
    if (current && current.profileId !== connection.profile_id) throw new ClientError('This browser is signed in to another profile. Sign out first.', 409);
    const token = `tpy_${randomHex(32)}`;
    await database.batch([
      database.prepare(`INSERT INTO devices (id, profile_id, token_hash, label, created_at, last_used_at)
        SELECT ?, profile_id, ?, label, ?, ? FROM connections WHERE code = ? AND claimed_at IS NULL AND expires_at > ?`)
        .bind(crypto.randomUUID(), await sha256(token), now, now, code, now),
      database.prepare('UPDATE connections SET claimed_at = ? WHERE code = ? AND claimed_at IS NULL AND expires_at > ?').bind(now, code, now),
    ]);
    const device = await database.prepare('SELECT id FROM devices WHERE token_hash = ?').bind(await sha256(token)).first();
    if (!device) throw new ClientError('This connection code was already used. Start again from the app.', 409);
    return json({ status: 'connected', handle: connection.handle, profileUrl: `https://typearchy.com/u/${connection.handle}` }, 200, { 'Set-Cookie': sessionCookie(request, token) });
  } catch (error) { return errorResponse(error); }
}
