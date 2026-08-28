import { authenticateDevice, db, json, sha256 } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const identity = await authenticateDevice(request);
  if (identity) return json({ status: 'connected', handle: identity.handle, profileUrl: `https://typearchy.com/u/${identity.handle}` });

  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer (tpy_[a-f0-9]{64})$/);
  if (!match) return json({ status: 'disconnected' }, 401);
  const tokenHash = await sha256(match[1]);
  const now = Math.floor(Date.now() / 1000);
  const pending = await db().prepare(`SELECT code, expires_at FROM connections
    WHERE token_hash = ? AND claimed_at IS NULL ORDER BY created_at DESC LIMIT 1`)
    .bind(tokenHash).first<{ code: string; expires_at: number }>();
  if (!pending || pending.expires_at <= now) return json({ status: 'disconnected' }, 401);
  return json({ status: 'pending', code: pending.code, expiresIn: pending.expires_at - now });
}
